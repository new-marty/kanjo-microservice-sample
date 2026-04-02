import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  return (
    <div className="bg-muted inline-flex gap-0.5 rounded-lg p-0.5">
      {TIME_RANGES.map((range) => (
        <Button
          key={range}
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 rounded-md px-2.5 text-xs font-medium',
            value === range
              ? 'bg-background text-foreground hover:bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
          )}
          onClick={() => onChange(range)}
        >
          {range}
        </Button>
      ))}
    </div>
  );
}
