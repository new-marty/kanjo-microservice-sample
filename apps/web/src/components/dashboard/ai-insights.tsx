import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDismissInsight, getListInsightsQueryKey } from '@repo/api-client';
import { EmptyState } from '@/components/empty-state';

type InsightType = 'alert' | 'optimize' | 'positive' | 'anomaly';

interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  actionUrl?: string;
}

interface AIInsightsProps {
  insights: Insight[];
}

const insightConfig: Record<
  InsightType,
  {
    icon: typeof AlertTriangle;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  alert: {
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
  },
  optimize: {
    icon: Lightbulb,
    color: 'text-ai',
    bgColor: 'bg-ai/10',
    borderColor: 'border-ai/20',
  },
  positive: {
    icon: TrendingUp,
    color: 'text-income',
    bgColor: 'bg-income/10',
    borderColor: 'border-income/20',
  },
  anomaly: {
    icon: AlertCircle,
    color: 'text-anomaly',
    bgColor: 'bg-anomaly/10',
    borderColor: 'border-anomaly/20',
  },
};

export function AIInsights({ insights }: AIInsightsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutate: dismiss } = useDismissInsight({
    mutation: {
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: getListInsightsQueryKey() });
        const prev = queryClient.getQueryData(getListInsightsQueryKey());
        queryClient.setQueryData(getListInsightsQueryKey(), (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const data = old as { data?: { data?: Array<{ id?: number }> } };
          if (!data.data?.data) return old;
          return {
            ...data,
            data: {
              ...data.data,
              data: data.data.data.filter((i) => i.id !== id),
            },
          };
        });
        return { prev };
      },
      onError: (_err, _vars, context) => {
        if (context?.prev) {
          queryClient.setQueryData(getListInsightsQueryKey(), context.prev);
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: getListInsightsQueryKey() });
      },
    },
  });

  return (
    <Card className="card-tint-ai">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <span className="from-ai bg-gradient-to-r to-purple-500 bg-clip-text text-transparent">
            {t('dashboard.aiInsights')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t('dashboard.noInsights', { defaultValue: 'No insights yet' })}
            description={t('dashboard.noInsightsDescription', {
              defaultValue: 'AI insights will appear here as we analyze your spending patterns.',
            })}
          />
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const config = insightConfig[insight.type];
              const Icon = config.icon;

              const content = (
                <div
                  className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${config.borderColor} ${insight.actionUrl ? 'hover:bg-accent/50 cursor-pointer' : ''}`}
                  style={{
                    animation: `fade-in 0.3s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div className={`rounded-md p-1.5 ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{insight.title}</p>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                      {insight.description}
                    </p>
                  </div>
                  {insight.actionUrl && (
                    <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dismiss({ id: Number(insight.id) });
                    }}
                    className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={t('common.dismiss')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );

              if (insight.actionUrl) {
                return (
                  <Link key={insight.id} to={insight.actionUrl}>
                    {content}
                  </Link>
                );
              }

              return <div key={insight.id}>{content}</div>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
