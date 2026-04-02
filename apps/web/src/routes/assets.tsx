import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { formatYen, formatYenSigned } from '@repo/shared';
import { useGetAssetComposition, useGetAssetTrend, useGetDailyRankings } from '@repo/api-client';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePreferencesStore } from '@/stores/preferences-store';
import { EmptyState } from '@/components/empty-state';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { TimeRangeToggle, type TimeRange } from '@/components/charts/time-range-toggle';
import { formatMonthTick, formatMonthYear } from '@/lib/date-locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const Route = createFileRoute('/assets')({
  component: Assets,
  errorComponent: ErrorBoundary,
});

const ASSET_TYPE_COLORS: Record<string, string> = {
  預金: '#16A34A',
  投資信託: '#0891B2',
  株式: '#7C3AED',
  年金: '#D97706',
  債券: '#EA580C',
  不動産: '#059669',
  暗号資産: '#8B5CF6',
};

const DEFAULT_COLOR = '#6B7280';

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
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, canAnimate]);

  return value;
}

function Assets() {
  const { t } = useTranslation();
  const { balanceVisible } = usePreferencesStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const {
    data: compositionRes,
    isLoading: compositionLoading,
    refetch: refetchComposition,
  } = useGetAssetComposition();
  const { data: trendRes, isLoading: trendLoading, refetch: refetchTrend } = useGetAssetTrend();
  const {
    data: rankingsRes,
    isLoading: rankingsLoading,
    refetch: refetchRankings,
  } = useGetDailyRankings();
  const refetch = () => {
    void refetchComposition();
    void refetchTrend();
    void refetchRankings();
  };
  const gradientId = useRef(`asset-trend-${Math.random().toString(36).slice(2)}`).current;

  const isLoading = compositionLoading || trendLoading || rankingsLoading;
  const hasError = !isLoading && !compositionRes && !trendRes && !rankingsRes;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{t('common.loadError')}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const assetComposition = (compositionRes?.data?.data ?? []).map((a) => ({
    type: a.asset_type ?? '',
    value: a.total ?? 0,
    color: ASSET_TYPE_COLORS[a.asset_type ?? ''] ?? DEFAULT_COLOR,
  }));

  const assetTrend = (trendRes?.data?.data ?? []).reduce<{ date: string; total: number }[]>(
    (acc, point) => {
      const existing = acc.find((p) => p.date === point.date);
      if (existing) {
        existing.total += point.total ?? 0;
      } else {
        acc.push({ date: point.date ?? '', total: point.total ?? 0 });
      }
      return acc;
    },
    []
  );

  const dailyRankings = (rankingsRes?.data?.data ?? []).map((r) => ({
    name: r.institution_name ?? '',
    change: r.change ?? 0,
    type: r.asset_type ?? '',
  }));

  const totalAssets = assetComposition.reduce((sum, a) => sum + a.value, 0);
  const currentTotal = assetTrend.length > 0 ? assetTrend[assetTrend.length - 1].total : 0;
  const previousTotal = assetTrend.length > 1 ? assetTrend[assetTrend.length - 2].total : 0;
  const changePercent =
    previousTotal > 0 ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1) : '0.0';
  const isPositiveChange = currentTotal >= previousTotal;

  const gainers = dailyRankings.filter((r) => r.change > 0).sort((a, b) => b.change - a.change);
  const decliners = dailyRankings.filter((r) => r.change < 0).sort((a, b) => a.change - b.change);

  // Filter trend data by time range
  const filteredTrend = (() => {
    if (timeRange === 'ALL') return assetTrend;
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[timeRange];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().slice(0, 7);
    return assetTrend.filter((p) => p.date >= cutoffStr);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('assets.title')}</h1>
        <p className="text-muted-foreground">{t('assets.description')}</p>
      </div>

      <AssetHero
        totalAssets={totalAssets}
        changePercent={changePercent}
        isPositiveChange={isPositiveChange}
        balanceVisible={balanceVisible}
        t={t}
      />

      {/* Asset Composition - Stacked Bar */}
      <Card>
        <CardHeader>
          <CardTitle>{t('assets.composition')}</CardTitle>
        </CardHeader>
        <CardContent>
          {assetComposition.length > 0 ? (
            <div className="space-y-4">
              <div className="flex h-8 overflow-hidden rounded-lg">
                {assetComposition.map((asset) => {
                  const pct = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
                  if (pct < 0.5) return null;
                  return (
                    <div
                      key={asset.type}
                      className="transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: asset.color,
                        minWidth: pct > 0 ? '4px' : 0,
                      }}
                      title={`${asset.type}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {assetComposition.map((asset) => {
                  const pct = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
                  return (
                    <div
                      key={asset.type}
                      className="flex items-center justify-between rounded-md px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: asset.color }}
                        />
                        <span className="text-sm font-medium">{asset.type}</span>
                        <span className="text-muted-foreground text-xs">{pct.toFixed(1)}%</span>
                      </div>
                      <span className="font-mono text-sm">
                        {balanceVisible ? formatYen(asset.value) : '¥•••••'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title={t('common.noData')}
              description={t('assets.noCompositionDescription', {
                defaultValue: 'Asset composition data will appear once accounts are synced.',
              })}
            />
          )}
        </CardContent>
      </Card>

      {/* Daily Rankings - Split into Gainers and Decliners */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="text-income h-4 w-4" />
              {t('assets.gainers', { defaultValue: 'Gainers' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gainers.length > 0 ? (
              <div className="space-y-2">
                {gainers.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="bg-income/5 flex items-center justify-between rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{item.type}</p>
                    </div>
                    <span className="text-income font-mono text-sm font-medium">
                      {balanceVisible ? formatYenSigned(item.change) : '¥•••'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">{t('common.noData')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="text-expense h-4 w-4" />
              {t('assets.decliners', { defaultValue: 'Decliners' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {decliners.length > 0 ? (
              <div className="space-y-2">
                {decliners.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="bg-expense/5 flex items-center justify-between rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{item.type}</p>
                    </div>
                    <span className="text-expense font-mono text-sm font-medium">
                      {balanceVisible ? formatYenSigned(item.change) : '¥•••'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">{t('common.noData')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asset Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('assets.trend')}</CardTitle>
            <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {filteredTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredTrend}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--income))" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(var(--income))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
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
                        nameFormatter={() => t('assets.totalAssetsLabel')}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--income))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={LineChartIcon}
                title={t('common.noData')}
                description={t('assets.noTrendDescription', {
                  defaultValue: 'Asset trend data will appear as your portfolio history builds up.',
                })}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetHero({
  totalAssets,
  changePercent,
  isPositiveChange,
  balanceVisible,
  t,
}: {
  totalAssets: number;
  changePercent: string;
  isPositiveChange: boolean;
  balanceVisible: boolean;
  t: (key: string) => string;
}) {
  const animatedValue = useAnimatedCounter(balanceVisible ? totalAssets : 0);

  return (
    <Card className="card-tint-income overflow-hidden">
      <CardContent className="pt-6">
        <div>
          <p className="text-muted-foreground text-sm">{t('assets.totalAssets')}</p>
          <p className="gradient-text-wealth font-mono text-4xl font-bold">
            {balanceVisible ? formatYen(animatedValue) : '¥•••••••'}
          </p>
          <Badge
            variant="outline"
            className={`mt-2 ${isPositiveChange ? 'border-income/30 bg-income/10 text-income' : 'border-expense/30 bg-expense/10 text-expense'}`}
          >
            {isPositiveChange ? (
              <TrendingUp className="mr-1 h-3 w-3" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3" />
            )}
            {isPositiveChange ? '+' : ''}
            {changePercent}% {t('assets.vsLastMonth')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
