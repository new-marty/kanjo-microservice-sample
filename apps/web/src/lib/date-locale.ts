import { ja, enUS } from 'date-fns/locale';
import i18n from '@/lib/i18n';

export function getDateLocale() {
  return i18n.language === 'en' ? enUS : ja;
}

export function formatMonthTick(monthStr: string): string {
  const [, month] = monthStr.split('-');
  const m = parseInt(month, 10);
  if (i18n.language === 'en') {
    const names = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return names[m - 1] ?? String(m);
  }
  return `${m}月`;
}

export function formatMonthYear(year: string, month: string): string {
  const m = parseInt(month, 10);
  if (i18n.language === 'en') {
    const names = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${names[m - 1]} ${year}`;
  }
  return `${year}年${m}月`;
}

export function formatDayTick(day: number): string {
  if (i18n.language === 'en') {
    return String(day);
  }
  return `${day}日`;
}

export function formatDayLabel(day: number | string): string {
  if (i18n.language === 'en') {
    return `Day ${day}`;
  }
  return `${day}日`;
}
