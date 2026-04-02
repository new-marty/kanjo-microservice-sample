import { useTranslation } from 'react-i18next';
import { formatYen, formatYenSigned, getCategoryEmoji } from '@repo/shared';
import { Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePreferencesStore } from '@/stores/preferences-store';
import { EmptyState } from '@/components/empty-state';

interface CategoryBudget {
  category: string;
  budget: number;
  spent: number;
  rollover: number;
  color: string;
  icon?: string;
}

interface CategoryBudgetsProps {
  budgets: CategoryBudget[];
}

export function CategoryBudgets({ budgets }: CategoryBudgetsProps) {
  const { t } = useTranslation();
  const { balanceVisible } = usePreferencesStore();

  if (budgets.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{t('dashboard.categoryBudgets')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Target}
            title={t('dashboard.noBudgets', { defaultValue: 'No budgets set' })}
            description={t('dashboard.noBudgetsDescription', {
              defaultValue: 'Set up category budgets to track your spending limits.',
            })}
            actionLabel={t('dashboard.setupBudgets', { defaultValue: 'Set up budgets' })}
            actionHref="/settings"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t('dashboard.categoryBudgets')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((item) => {
          const effectiveBudget = item.budget + item.rollover;
          const percentage = Math.min((item.spent / effectiveBudget) * 100, 100);
          const remaining = effectiveBudget - item.spent;
          const isOverBudget = remaining < 0;
          const isNearLimit = percentage >= 90 && !isOverBudget;
          const emoji = item.icon || getCategoryEmoji(item.category);

          return (
            <div key={item.category} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base" role="img" aria-label={item.category}>
                    {emoji}
                  </span>
                  <span className="font-medium">{item.category}</span>
                  {item.rollover !== 0 && (
                    <Badge
                      variant="outline"
                      className="border-savings/30 bg-savings/10 text-savings h-5 px-1.5 text-[10px]"
                    >
                      {t('dashboard.rollover', { amount: formatYenSigned(item.rollover) })}
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground font-mono">
                  {balanceVisible
                    ? `${formatYen(item.spent)} / ${formatYen(effectiveBudget)}`
                    : '¥••• / ¥•••'}
                </span>
              </div>
              <div className="relative">
                <Progress
                  value={percentage}
                  className={`h-2 ${isOverBudget ? '[&>div]:bg-expense' : isNearLimit ? '[&>div]:bg-warning' : ''}`}
                  style={
                    !isOverBudget && !isNearLimit
                      ? ({ '--progress-color': item.color } as React.CSSProperties)
                      : undefined
                  }
                />
              </div>
              <p
                className={`text-xs ${isOverBudget ? 'text-expense' : isNearLimit ? 'text-warning' : 'text-muted-foreground'}`}
              >
                {isOverBudget
                  ? t('dashboard.exceeded', {
                      amount: balanceVisible ? formatYen(Math.abs(remaining)) : '¥•••',
                    })
                  : t('dashboard.remaining', {
                      amount: balanceVisible ? formatYen(remaining) : '¥•••',
                    })}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
