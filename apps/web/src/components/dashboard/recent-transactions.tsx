import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { formatYenSigned, getCategoryEmoji, getCategoryColor } from '@repo/shared';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePreferencesStore } from '@/stores/preferences-store';

interface Transaction {
  hash: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  account: string;
  reviewed: boolean;
  categoryIcon?: string;
  categoryColor?: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { t } = useTranslation();
  const { balanceVisible } = usePreferencesStore();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {t('dashboard.recentTransactions')}
          </CardTitle>
          <Link
            to="/transactions"
            className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium"
          >
            {t('dashboard.viewAll')}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {transactions.map((tx) => {
            const isIncome = tx.amount > 0;
            const date = parseISO(tx.date);
            const emoji = tx.categoryIcon || getCategoryEmoji(tx.category);
            const color = tx.categoryColor || getCategoryColor(tx.category);

            return (
              <div
                key={tx.hash}
                className="hover:bg-accent/50 relative flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
              >
                {!tx.reviewed && (
                  <span className="bg-warning absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full" />
                )}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <span className="text-sm" role="img" aria-label={tx.category}>
                    {emoji}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{tx.description}</span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${color}15`,
                        color: color,
                      }}
                    >
                      {tx.category}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {format(date, 'M/d(E)', { locale: getDateLocale() })} · {tx.account}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono text-sm font-medium ${
                    isIncome ? 'text-income' : 'text-foreground'
                  }`}
                >
                  {balanceVisible ? formatYenSigned(tx.amount) : '¥•••'}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
