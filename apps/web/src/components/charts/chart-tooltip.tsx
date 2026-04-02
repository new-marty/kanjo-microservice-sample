import { usePreferencesStore } from '@/stores/preferences-store';
import { formatYen } from '@repo/shared';

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  nameFormatter?: (name: string) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  nameFormatter,
}: ChartTooltipProps) {
  const { balanceVisible } = usePreferencesStore();

  if (!active || !payload?.length) return null;

  const formattedLabel = labelFormatter ? labelFormatter(label ?? '') : String(label ?? '');

  return (
    <div className="bg-card rounded-lg border p-3 shadow-lg">
      <p className="text-muted-foreground mb-1.5 text-xs font-medium">{formattedLabel}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground text-sm">
              {nameFormatter ? nameFormatter(entry.name) : entry.name}
            </span>
            <span className="ml-auto font-mono text-sm font-medium">
              {balanceVisible ? formatYen(entry.value) : '¥•••••'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
