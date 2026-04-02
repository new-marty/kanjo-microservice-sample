import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatYen } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePreferencesStore } from '@/stores/preferences-store';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { formatDayTick, formatDayLabel } from '@/lib/date-locale';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';

interface SpendingPaceProps {
  daysInMonth: number;
  dayOfMonth: number;
  budget: number;
  actualSpending: { day: number; cumulative: number }[];
}

export function SpendingPace({
  daysInMonth,
  dayOfMonth,
  budget,
  actualSpending,
}: SpendingPaceProps) {
  const { t } = useTranslation();
  const { balanceVisible } = usePreferencesStore();
  const gradientId = useRef(`spending-pace-${Math.random().toString(36).slice(2)}`).current;

  const idealPace = Array.from({ length: daysInMonth + 1 }, (_, i) => ({
    day: i,
    ideal: Math.round((budget / daysInMonth) * i),
  }));

  const chartData = idealPace.map((point) => {
    const actual = actualSpending.find((a) => a.day === point.day);
    return {
      ...point,
      actual: actual?.cumulative,
    };
  });

  const currentSpending = actualSpending[actualSpending.length - 1]?.cumulative ?? 0;
  const idealForToday = Math.round((budget / daysInMonth) * dayOfMonth);
  const difference = idealForToday - currentSpending;
  const isUnderBudget = difference >= 0;
  const paceColor = isUnderBudget ? 'hsl(var(--income))' : 'hsl(var(--expense))';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-medium">{t('dashboard.spendingPace')}</CardTitle>
          <div className="sm:text-right">
            <p className="font-mono text-sm">
              {balanceVisible ? formatYen(currentSpending) : '¥•••••'}{' '}
              <span className="text-muted-foreground">/ {formatYen(budget)}</span>
            </p>
            <p className={`text-xs ${isUnderBudget ? 'text-income' : 'text-expense'}`}>
              {isUnderBudget ? t('dashboard.underBudget') : t('dashboard.overBudget')}{' '}
              {balanceVisible ? `${isUnderBudget ? '+' : ''}${formatYen(difference)}` : '•••'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={paceColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={paceColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => (value % 5 === 0 ? formatDayTick(value) : '')}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  balanceVisible ? `¥${(value / 10000).toFixed(0)}万` : '•••'
                }
                width={50}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    labelFormatter={(label) => formatDayLabel(Number(label))}
                    nameFormatter={(name) =>
                      name === 'ideal' ? t('dashboard.idealPace') : t('dashboard.actual')
                    }
                  />
                }
              />
              <ReferenceLine
                x={dayOfMonth}
                stroke="hsl(var(--border))"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: t('dashboard.today', { defaultValue: 'Today' }),
                  position: 'top',
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))',
                }}
              />
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke={paceColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                connectNulls
              />
              {currentSpending > 0 && (
                <ReferenceDot
                  x={dayOfMonth}
                  y={currentSpending}
                  r={4}
                  fill={paceColor}
                  stroke="white"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
