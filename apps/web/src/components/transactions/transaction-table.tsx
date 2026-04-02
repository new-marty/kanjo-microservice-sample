import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { ArrowUpDown, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatYenSigned, getCategoryEmoji, getCategoryColor } from '@repo/shared';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useListTransactions,
  useReviewTransaction,
  getListTransactionsQueryKey,
  type Transaction,
  type ListTransactionsParams,
} from '@repo/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useTransactionFilters } from '@/hooks/use-transaction-filters';
import { TransactionDetailSheet } from './transaction-detail-sheet';

const PAGE_SIZE = 20;

export function TransactionTable() {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { balanceVisible } = usePreferencesStore();
  const { filters } = useTransactionFilters();
  const queryClient = useQueryClient();

  const params: ListTransactionsParams = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.categories.length > 0 ? { categories: filters.categories } : {}),
    ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
    ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
    ...(filters.reviewed !== null ? { reviewed: filters.reviewed } : {}),
  };

  const { data: txRes, isLoading } = useListTransactions(params);
  const reviewMutation = useReviewTransaction();

  const transactions: Transaction[] = useMemo(() => txRes?.data?.data ?? [], [txRes]);
  const total = txRes?.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
  }, [queryClient]);

  const handleReviewToggle = useCallback(
    (hash: string, currentReviewed: boolean) => {
      reviewMutation.mutate(
        { hash, data: { reviewed: !currentReviewed } },
        {
          onSuccess: () => {
            invalidate();
            toast(
              currentReviewed
                ? t('transactions.toast.markedUnreviewed')
                : t('transactions.toast.markedReviewed'),
              {
                action: {
                  label: t('common.undo'),
                  onClick: () => {
                    reviewMutation.mutate(
                      { hash, data: { reviewed: currentReviewed } },
                      { onSuccess: invalidate }
                    );
                  },
                },
              }
            );
          },
        }
      );
    },
    [reviewMutation, invalidate, t]
  );

  const handleRowClick = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setSheetOpen(true);
  }, []);

  const handleBulkReview = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    const selectedTxs = selectedIndices
      .map((idx) => transactions[Number(idx)])
      .filter((tx): tx is Transaction => tx !== undefined);

    if (selectedTxs.length === 0) return;

    const prevStates = selectedTxs.map((tx) => ({
      hash: tx.hash,
      reviewed: tx.reviewed ?? false,
    }));

    const results = await Promise.allSettled(
      selectedTxs.map((tx) =>
        reviewMutation.mutateAsync({ hash: tx.hash, data: { reviewed: true } })
      )
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    invalidate();
    setRowSelection({});
    setSelectMode(false);

    if (failed > 0) {
      toast.error(t('transactions.toast.bulkFailed', { count: failed }));
    } else {
      toast(t('transactions.toast.bulkReviewed', { count: selectedTxs.length }), {
        action: {
          label: t('common.undo'),
          onClick: () => {
            void Promise.allSettled(
              prevStates.map((prev) =>
                reviewMutation.mutateAsync({
                  hash: prev.hash,
                  data: { reviewed: prev.reviewed },
                })
              )
            ).then(invalidate);
          },
        },
      });
    }
  }, [rowSelection, transactions, reviewMutation, invalidate, t]);

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        id: selectMode ? 'select' : 'reviewed',
        header: selectMode
          ? ({ table }) => (
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                  }
                  onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                  aria-label={t('transactions.selectAll')}
                />
              </div>
            )
          : '',
        cell: ({ row }) =>
          selectMode ? (
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label={t('transactions.selectRow')}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={row.original.reviewed ?? false}
                onCheckedChange={() =>
                  handleReviewToggle(row.original.hash, row.original.reviewed ?? false)
                }
                aria-label={t('transactions.markReviewed')}
              />
            </div>
          ),
        size: 40,
      },
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            {t('transactions.date')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = parseISO(row.getValue('date'));
          return (
            <span className="text-muted-foreground whitespace-nowrap">
              {format(date, 'M/d(E)', { locale: getDateLocale() })}
            </span>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'description',
        header: t('transactions.content'),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.getValue('description')}</p>
            {row.original.notes && (
              <p className="text-muted-foreground truncate text-xs">{row.original.notes}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'category_name',
        header: t('transactions.category'),
        cell: ({ row }) => {
          const categoryName = String(row.getValue('category_name') ?? '');
          const emoji = getCategoryEmoji(categoryName);
          const color = getCategoryColor(categoryName);
          return (
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <span role="img" aria-label={categoryName}>
                {emoji}
              </span>
              {categoryName || t('transactions.uncategorized')}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'account_name',
        header: t('transactions.account'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {row.getValue('account_name')}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-mr-4 ml-auto"
          >
            {t('transactions.amount')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const amount = row.original.amount;
          const isIncome = amount > 0;
          return (
            <span
              className={`whitespace-nowrap text-right font-mono font-medium ${
                isIncome ? 'text-income' : 'text-foreground'
              }`}
            >
              {balanceVisible ? formatYenSigned(amount) : '¥•••••'}
            </span>
          );
        },
        size: 120,
      },
    ],
    [balanceVisible, handleReviewToggle, selectMode, t]
  );

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: selectMode,
    state: {
      sorting,
      rowSelection,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Select mode toggle */}
      <div className="flex items-center justify-end">
        <Button
          variant={selectMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSelectMode(!selectMode);
            setRowSelection({});
          }}
        >
          <CheckSquare className="mr-1.5 h-4 w-4" />
          {t('transactions.select')}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={`even:bg-muted/30 cursor-pointer ${!(row.original.reviewed ?? false) ? 'border-l-warning border-l-2' : ''}`}
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('transactions.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {total > 0 ? (
            <>
              {t('transactions.pagination.showing', {
                total,
                start: page * PAGE_SIZE + 1,
                end: Math.min((page + 1) * PAGE_SIZE, total),
              })}
            </>
          ) : (
            t('transactions.pagination.noResults')
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            {t('transactions.pagination.prev')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            {t('transactions.pagination.next')}
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && selectedCount > 0 && (
        <div className="bg-background fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {t('transactions.bulkSelected', { count: selectedCount })}
          </span>
          <Button size="sm" onClick={() => void handleBulkReview()}>
            {t('transactions.markReviewed')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRowSelection({});
              setSelectMode(false);
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {/* Detail sheet */}
      <TransactionDetailSheet
        transaction={selectedTransaction}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
