export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Housing',
  'Utilities',
  'Healthcare',
  'Education',
  'Transfer',
  'Income',
  'Other',
] as const;

export type CategoryName = (typeof DEFAULT_CATEGORIES)[number];

export const CATEGORY_EMOJIS: Record<string, string> = {
  食費: '🍽️',
  交通費: '🚃',
  日用品: '🛒',
  趣味・娯楽: '🎮',
  住宅: '🏠',
  水道・光熱費: '💡',
  医療費: '🏥',
  教育: '📚',
  振替: '🔄',
  収入: '💰',
  通信費: '📱',
  保険: '🛡️',
  衣服・美容: '👔',
  自動車: '🚗',
  税金: '🏛️',
  現金・カード: '💳',
  その他: '📦',
  'Food & Dining': '🍽️',
  Transportation: '🚃',
  Shopping: '🛒',
  Entertainment: '🎮',
  Housing: '🏠',
  Utilities: '💡',
  Healthcare: '🏥',
  Education: '📚',
  Transfer: '🔄',
  Income: '💰',
  Other: '📦',
};

export function getCategoryEmoji(name: string): string {
  return CATEGORY_EMOJIS[name] ?? '📦';
}

export function getCategoryColor(name: string): string {
  if (name in CATEGORY_COLORS) {
    return CATEGORY_COLORS[name as CategoryName];
  }
  return '#6B7280';
}

export const CATEGORY_COLORS: Record<CategoryName, string> = {
  'Food & Dining': '#ef4444',
  Transportation: '#f97316',
  Shopping: '#eab308',
  Entertainment: '#22c55e',
  Housing: '#3b82f6',
  Utilities: '#6366f1',
  Healthcare: '#ec4899',
  Education: '#8b5cf6',
  Transfer: '#6b7280',
  Income: '#10b981',
  Other: '#9ca3af',
};
