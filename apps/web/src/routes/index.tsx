import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/error-boundary';
import { useGetDashboard, useListInsights } from '@repo/api-client';
import { useTranslation } from 'react-i18next';
import {
  NetWorthHero,
  MonthlySummary,
  SpendingPace,
  CategoryBudgets,
  AIInsights,
  RecentTransactions,
} from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: Dashboard,
  errorComponent: ErrorBoundary,
});

function Dashboard() {
  const { t } = useTranslation();
  const { data: dashboardRes, isLoading, error, refetch } = useGetDashboard();
  const { data: insightsRes } = useListInsights();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-48" />
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

  const dashboard = dashboardRes?.data;
  if (!dashboard) return null;

  const sparklineData = (dashboard.net_worth?.history ?? []).map((h) => ({
    date: h.date ?? '',
    value: h.total ?? 0,
  }));

  const actualSpending = (dashboard.spending_pace?.actual_spending ?? []).map((s) => ({
    day: s.day_of_month ?? 0,
    cumulative: s.cumulative_spending ?? 0,
  }));

  const budgets = (dashboard.category_budgets ?? []).map((b) => ({
    category: b.category_name ?? '',
    budget: b.monthly_budget ?? 0,
    spent: b.spent ?? 0,
    rollover: b.rollover ?? 0,
    color: b.color ?? '#888',
  }));

  const recentTransactions = (dashboard.recent_transactions ?? []).map((tx) => ({
    hash: tx.hash ?? '',
    date: tx.date ?? '',
    description: tx.description ?? '',
    amount: tx.amount ?? 0,
    category: tx.category_name ?? '',
    account: tx.account_name ?? '',
    reviewed: tx.reviewed ?? false,
  }));

  const insights = (insightsRes?.data?.data ?? []).map((i) => ({
    id: String(i.id ?? 0),
    type: i.type as 'alert' | 'optimize' | 'positive' | 'anomaly',
    title: i.title ?? '',
    description: i.description ?? '',
    actionUrl: i.action_url,
  }));

  return (
    <div className="space-y-6">
      {/* Hero section: Net Worth + Monthly Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <NetWorthHero
          current={dashboard.net_worth?.current ?? 0}
          previousMonth={dashboard.net_worth?.previous_month ?? 0}
          sparklineData={sparklineData}
        />
        <MonthlySummary
          income={dashboard.monthly_summary?.income ?? 0}
          expenses={dashboard.monthly_summary?.expenses ?? 0}
          saved={dashboard.monthly_summary?.saved ?? 0}
          savingsRate={dashboard.monthly_summary?.savings_rate ?? 0}
        />
      </div>

      {/* Spending pace chart */}
      <SpendingPace
        daysInMonth={dashboard.spending_pace?.days_in_month ?? 30}
        dayOfMonth={dashboard.spending_pace?.day_of_month ?? 1}
        budget={dashboard.spending_pace?.budget ?? 0}
        actualSpending={actualSpending}
      />

      {/* Budgets + AI Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <CategoryBudgets budgets={budgets} />
        <AIInsights insights={insights} />
      </div>

      {/* Recent transactions */}
      <RecentTransactions transactions={recentTransactions} />
    </div>
  );
}
