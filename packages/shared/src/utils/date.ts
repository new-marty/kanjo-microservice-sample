import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

export function formatDateRange(start: Date, end: Date): string {
  return `${format(start, 'yyyy-MM-dd')} - ${format(end, 'yyyy-MM-dd')}`;
}

export function groupByMonth(start: Date, end: Date): Date[] {
  return eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(end) });
}
