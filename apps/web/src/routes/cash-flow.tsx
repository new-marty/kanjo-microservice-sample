import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/error-boundary';
import { Loader2, ArrowDownLeft, ArrowUpRight, PiggyBank, TrendingUp } from 'lucide-react';
import { formatYen } from '@repo/shared';
import { useGetCashFlow } from '@repo/api-client';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePreferencesStore } from '@/stores/preferences-store';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { TimeRangeToggle, type TimeRange } from '@/components/charts/time-range-toggle';
import { formatMonthTick, formatMonthYear } from '@/lib/date-locale';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const Route = createFileRoute('/cash-flow')({
  component: CashFlow,
  errorComponent: ErrorBoundary,
});

function CashFlow() {
  const { t } = useTranslation();
  const { balanceVisible } = usePreferencesStore();
  const { data: cashFlowRes, isLoading, error, refetch } = useGetCashFlow();
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{t('common.loadError')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const cashFlowData = (cashFlowRes?.data?.data ?? []).map((d) => ({
    month: d.month ?? '',
    income: d.income ?? 0,
    expenses: d.expenses ?? 0,
    net: (d.income ?? 0) - (d.expenses ?? 0),
  }));

  // Filter by time range
  const filteredData = (() => {
    if (timeRange === 'ALL') return cashFlowData;
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[timeRange];
    return cashFlowData.slice(-months);
  })();

  const totalIncome = filteredData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = filteredData.reduce((sum, d) => sum + d.expenses, 0);
  const netSavings = totalIncome - totalExpenses;
  const avgSavingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

  const summaryCards = [
    {
      label: t('cashFlow.periodIncome'),
      value: totalIncome,
      color: 'text-income',
      bgColor: 'bg-income/10',
      icon: ArrowDownLeft,
      iconColor: 'text-income',
    },
    {
      label: t('cashFlow.periodExpenses'),
      value: totalExpenses,
      color: 'text-expense',
      bgColor: 'bg-expense/10',
      icon: ArrowUpRight,
      iconColor: 'text-expense',
    },
    {
      label: t('cashFlow.netSavings'),
      value: netSavings,
      color: netSavings >= 0 ? 'text-savings' : 'text-expense',
      bgColor: netSavings >= 0 ? 'bg-savings/10' : 'bg-expense/10',
      icon: PiggyBank,
      iconColor: netSavings >= 0 ? 'text-savings' : 'text-expense',
    },
    {
      label: t('cashFlow.avgSavingsRate'),
      value: null,
      displayValue: `${avgSavingsRate}%`,
      color: 'text-foreground',
      bgColor: 'bg-muted',
      icon: TrendingUp,
      iconColor: 'text-muted-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('cashFlow.title')}</h1>
        <p className="text-muted-foreground">{t('cashFlow.description')}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bgColor}`}
                >
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs">{card.label}</p>
                  <p className={`truncate font-mono text-lg font-bold ${card.color}`}>
                    {card.displayValue ??
                      (balanceVisible ? formatYen(card.value ?? 0) : '¥•••••••')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('cashFlow.monthlyChart')}</CardTitle>
            <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredData} barGap={4}>
                <XAxis
                  dataKey="month"
                  tickFormatter={(value: string) => formatMonthTick(value)}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) =>
                    balanceVisible ? `¥${(value / 10000).toFixed(0)}万` : '•••'
                  }
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormatter={(label) => {
                        const [year, month] = String(label).split('-');
                        return formatMonthYear(year, month);
                      }}
                      nameFormatter={(name) => {
                        if (name === 'income') return t('cashFlow.income');
                        if (name === 'expenses') return t('cashFlow.expenses');
                        return t('cashFlow.netSavings');
                      }}
                    />
                  }
                />
                <Legend
                  formatter={(value) => {
                    if (value === 'income') return t('cashFlow.income');
                    if (value === 'expenses') return t('cashFlow.expenses');
                    return t('cashFlow.netSavings');
                  }}
                />
                <Bar
                  dataKey="income"
                  fill="hsl(var(--income))"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
                <Bar
                  dataKey="expenses"
                  fill="hsl(var(--expense))"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="hsl(var(--savings))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--savings))' }}
                  name="net"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
