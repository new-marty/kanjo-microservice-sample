import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { formatYenSigned } from '@repo/shared';
import {
  useReviewTransaction,
  getListTransactionsQueryKey,
  type Transaction,
} from '@repo/api-client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORIES, getCategoryDisplayName } from './categories';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailSheet({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const reviewMutation = useReviewTransaction();
  const [tagInput, setTagInput] = useState('');
  const notesRef = useRef<HTMLInputElement>(null);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
  }, [queryClient]);

  const handleCategoryChange = useCallback(
    (value: string) => {
      if (!transaction) return;
      const prev = transaction.category_override ?? transaction.category_id ?? '';
      const newValue = value === 'none' ? '' : value;

      reviewMutation.mutate(
        { hash: transaction.hash, data: { category_override: newValue || undefined } },
        {
          onSuccess: () => {
            invalidate();
            toast(t('transactions.toast.categoryChanged'), {
              action: {
                label: t('common.undo'),
                onClick: () => {
                  reviewMutation.mutate(
                    {
                      hash: transaction.hash,
                      data: { category_override: prev || undefined },
                    },
                    { onSuccess: invalidate }
                  );
                },
              },
            });
          },
        }
      );
    },
    [transaction, reviewMutation, invalidate, t]
  );

  const handleReviewToggle = useCallback(
    (checked: boolean) => {
      if (!transaction) return;
      const prev = transaction.reviewed ?? false;

      reviewMutation.mutate(
        { hash: transaction.hash, data: { reviewed: checked } },
        {
          onSuccess: () => {
            invalidate();
            toast(
              checked
                ? t('transactions.toast.markedReviewed')
                : t('transactions.toast.markedUnreviewed'),
              {
                action: {
                  label: t('common.undo'),
                  onClick: () => {
                    reviewMutation.mutate(
                      { hash: transaction.hash, data: { reviewed: prev } },
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
    [transaction, reviewMutation, invalidate, t]
  );

  const handleNotesBlur = useCallback(() => {
    if (!transaction || !notesRef.current) return;
    const newNotes = notesRef.current.value;
    const prev = transaction.notes ?? '';
    if (newNotes === prev) return;

    reviewMutation.mutate(
      { hash: transaction.hash, data: { notes: newNotes || undefined } },
      {
        onSuccess: () => {
          invalidate();
          toast(t('transactions.toast.notesSaved'), {
            action: {
              label: t('common.undo'),
              onClick: () => {
                reviewMutation.mutate(
                  { hash: transaction.hash, data: { notes: prev || undefined } },
                  { onSuccess: invalidate }
                );
              },
            },
          });
        },
      }
    );
  }, [transaction, reviewMutation, invalidate, t]);

  const handleAddTag = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || !transaction) return;
      const tag = tagInput.trim();
      if (!tag) return;

      const prevTags = transaction.tags ?? [];
      if (prevTags.includes(tag)) {
        setTagInput('');
        return;
      }

      const newTags = [...prevTags, tag];
      setTagInput('');

      reviewMutation.mutate(
        { hash: transaction.hash, data: { tags: newTags } },
        {
          onSuccess: () => {
            invalidate();
            toast(t('transactions.toast.tagAdded'), {
              action: {
                label: t('common.undo'),
                onClick: () => {
                  reviewMutation.mutate(
                    { hash: transaction.hash, data: { tags: prevTags } },
                    { onSuccess: invalidate }
                  );
                },
              },
            });
          },
        }
      );
    },
    [transaction, tagInput, reviewMutation, invalidate, t]
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (!transaction) return;
      const prevTags = transaction.tags ?? [];
      const newTags = prevTags.filter((tg) => tg !== tagToRemove);

      reviewMutation.mutate(
        { hash: transaction.hash, data: { tags: newTags } },
        {
          onSuccess: () => {
            invalidate();
            toast(t('transactions.toast.tagRemoved'), {
              action: {
                label: t('common.undo'),
                onClick: () => {
                  reviewMutation.mutate(
                    { hash: transaction.hash, data: { tags: prevTags } },
                    { onSuccess: invalidate }
                  );
                },
              },
            });
          },
        }
      );
    },
    [transaction, reviewMutation, invalidate, t]
  );

  if (!transaction) return null;

  const isIncome = transaction.amount > 0;
  const currentCategoryId = transaction.category_override ?? transaction.category_id ?? '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{transaction.description}</SheetTitle>
          <SheetDescription className="text-left">
            {format(parseISO(transaction.date), 'PPP(E)', { locale: getDateLocale() })} ・{' '}
            {transaction.account_name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Amount */}
          <div>
            <label className="text-muted-foreground text-sm">
              {t('transactions.detail.amount')}
            </label>
            <p
              className={`font-mono text-2xl font-bold ${
                isIncome ? 'text-income' : 'text-foreground'
              }`}
            >
              {formatYenSigned(transaction.amount)}
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-sm">
              {t('transactions.detail.category')}
            </label>
            <Select value={currentCategoryId || 'none'} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('transactions.detail.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('transactions.uncategorized')}</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {getCategoryDisplayName(cat.id, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reviewed */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="detail-reviewed"
              checked={transaction.reviewed ?? false}
              onCheckedChange={(checked) => handleReviewToggle(checked === true)}
            />
            <label htmlFor="detail-reviewed" className="text-sm font-medium">
              {t('transactions.detail.reviewed')}
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-sm">
              {t('transactions.detail.notes')}
            </label>
            <Input
              ref={notesRef}
              key={transaction.hash}
              defaultValue={transaction.notes ?? ''}
              placeholder={t('transactions.detail.notesPlaceholder')}
              onBlur={handleNotesBlur}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-sm">
              {t('transactions.detail.tags')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(transaction.tags ?? []).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
            <Input
              className="mt-2"
              placeholder={t('transactions.detail.tagsPlaceholder')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
