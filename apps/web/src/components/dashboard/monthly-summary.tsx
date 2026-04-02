import { useTranslation } from 'react-i18next';
import { formatYen } from '@repo/shared';
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePreferencesStore } from '@/stores/preferences-store';

interface MonthlySummaryProps {
  income: number;
  expenses: number;
  saved: number;
  savingsRate: number;
}

export function MonthlySummary({ income, expenses, saved, savingsRate }: MonthlySummaryProps) {
  const { t } = useTranslation();
  const { balanceVisible } = usePreferencesStore();

  const items = [
    {
      label: t('dashboard.income'),
      value: income,
      icon: ArrowDownLeft,
      color: 'text-income',
      bgColor: 'bg-income/20',
      tintBg: 'bg-income/5',
    },
    {
      label: t('dashboard.expenses'),
      value: expenses,
      icon: ArrowUpRight,
      color: 'text-expense',
      bgColor: 'bg-expense/20',
      tintBg: 'bg-expense/5',
    },
    {
      label: t('dashboard.savings'),
      value: saved,
      icon: PiggyBank,
      color: 'text-savings',
      bgColor: 'bg-savings/20',
      tintBg: 'bg-savings/5',
    },
  ];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {items.map((item, i) => (
            <div
              key={item.label}
              className={`p-4 ${item.tintBg} ${i === 0 ? 'rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none' : ''} ${i === 2 ? 'rounded-b-xl sm:rounded-r-xl sm:rounded-bl-none' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bgColor}`}
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-sm">{item.label}</p>
                  <p className="truncate font-mono text-lg font-semibold">
                    {balanceVisible ? formatYen(item.value) : '¥•••••'}
                  </p>
                  {i === 2 && (
                    <Badge
                      variant="outline"
                      className="border-savings/30 bg-savings/10 text-savings mt-0.5 text-xs"
                    >
                      {t('dashboard.savingsRate', { rate: savingsRate.toFixed(1) })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
