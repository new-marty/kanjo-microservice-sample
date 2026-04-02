import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTransactionFilters } from '@/hooks/use-transaction-filters';
import { CATEGORIES, getCategoryById, getCategoryDisplayName } from './categories';

export function TransactionFilters() {
  const { t } = useTranslation();
  const { filters, setFilters, clearFilters, hasActiveFilters } = useTransactionFilters();
  const [categoryOpen, setCategoryOpen] = useState(false);

  const toggleCategory = (categoryId: string) => {
    const current = filters.categories;
    const updated = current.includes(categoryId)
      ? current.filter((c) => c !== categoryId)
      : [...current, categoryId];
    void setFilters({ categories: updated });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <div className="relative w-full sm:min-w-[200px] sm:max-w-sm sm:flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t('transactions.searchPlaceholder')}
          value={filters.search}
          onChange={(e) => void setFilters({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Category multi-select */}
      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[140px] justify-between">
            {filters.categories.length > 0 ? (
              <span className="truncate">
                {t('transactions.selectedCount', { count: filters.categories.length })}
              </span>
            ) : (
              <span className="text-muted-foreground">{t('transactions.categoryFilter')}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-2" align="start">
          <div className="max-h-[300px] space-y-1 overflow-y-auto">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  filters.categories.includes(category.id) && 'bg-accent'
                )}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border',
                    filters.categories.includes(category.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground'
                  )}
                >
                  {filters.categories.includes(category.id) && <Check className="h-3 w-3" />}
                </div>
                <span>
                  {category.icon} {getCategoryDisplayName(category.id, t)}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Date range */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => void setFilters({ dateFrom: e.target.value || null })}
          className="w-[140px]"
          placeholder={t('transactions.dateFrom')}
        />
        <span className="text-muted-foreground">〜</span>
        <Input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => void setFilters({ dateTo: e.target.value || null })}
          className="w-[140px]"
          placeholder={t('transactions.dateTo')}
        />
      </div>

      {/* Reviewed status */}
      <Select
        value={filters.reviewed === null ? 'all' : filters.reviewed ? 'reviewed' : 'unreviewed'}
        onValueChange={(value) => {
          if (value === 'all') {
            void setFilters({ reviewed: null });
          } else {
            void setFilters({ reviewed: value === 'reviewed' });
          }
        }}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder={t('transactions.reviewStatus')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('transactions.all')}</SelectItem>
          <SelectItem value="reviewed">{t('transactions.reviewed')}</SelectItem>
          <SelectItem value="unreviewed">{t('transactions.unreviewed')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          {t('transactions.clear')}
        </Button>
      )}

      {/* Active filter badges */}
      {filters.categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filters.categories.map((categoryId) => {
            const category = getCategoryById(categoryId);
            return (
              <Badge
                key={categoryId}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => toggleCategory(categoryId)}
              >
                {category
                  ? `${category.icon} ${getCategoryDisplayName(category.id, t)}`
                  : categoryId}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
