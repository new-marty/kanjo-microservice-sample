import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatYen, formatYenSigned } from '@repo/shared';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePreferencesStore } from '@/stores/preferences-store';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const canAnimate =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    typeof window.requestAnimationFrame === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!canAnimate || target === 0) {
      setValue(target);
      return;
    }

    let start: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, canAnimate]);

  return value;
}

interface NetWorthHeroProps {
  current: number;
  previousMonth: number;
  sparklineData: { date: string; value: number }[];
}

export function NetWorthHero({ current, previousMonth, sparklineData }: NetWorthHeroProps) {
  const { t } = useTranslation();
  const { balanceVisible } = usePreferencesStore();
  const animatedValue = useAnimatedCounter(balanceVisible ? current : 0);
  const change = current - previousMonth;
  const changePercent = previousMonth !== 0 ? ((change / previousMonth) * 100).toFixed(1) : '0.0';
  const isPositive = change >= 0;
  const gradientId = useRef(`net-worth-gradient-${Math.random().toString(36).slice(2)}`).current;

  return (
    <Card className="card-tint-income overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('dashboard.netWorth')}</p>
            <p className="gradient-text-wealth font-mono text-4xl font-bold tracking-tight">
              {balanceVisible ? formatYen(animatedValue) : '¥•••••••'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Badge
                variant="outline"
                className={
                  isPositive
                    ? 'border-income/30 bg-income/10 text-income'
                    : 'border-expense/30 bg-expense/10 text-expense'
                }
              >
                {isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {isPositive ? '+' : ''}
                {changePercent}%
              </Badge>
              <span className="text-muted-foreground text-sm">
                {balanceVisible ? formatYenSigned(change) : '•••'} {t('common.vsLastMonth')}
              </span>
            </div>
          </div>
          <div className="hidden h-24 w-48 sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--income))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--income))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? 'hsl(var(--income))' : 'hsl(var(--expense))'}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
