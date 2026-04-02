import type { TFunction } from 'i18next';

interface Category {
  id: string;
  icon: string;
  color: string;
  isIncome: boolean;
}

export const CATEGORIES: Category[] = [
  // Income
  { id: 'income-salary', icon: '💰', color: '#16A34A', isIncome: true },
  { id: 'income-bonus', icon: '🎁', color: '#16A34A', isIncome: true },
  { id: 'income-investment', icon: '📈', color: '#16A34A', isIncome: true },
  { id: 'income-other', icon: '💵', color: '#16A34A', isIncome: true },

  // Food & Dining
  { id: 'expense-food', icon: '🍽️', color: '#F97316', isIncome: false },
  { id: 'expense-groceries', icon: '🛒', color: '#F97316', isIncome: false },
  { id: 'expense-restaurant', icon: '🍜', color: '#F97316', isIncome: false },
  { id: 'expense-cafe', icon: '☕', color: '#F97316', isIncome: false },

  // Daily
  { id: 'expense-daily', icon: '🧴', color: '#8B5CF6', isIncome: false },

  // Housing
  { id: 'expense-housing', icon: '🏠', color: '#06B6D4', isIncome: false },
  { id: 'expense-rent', icon: '🔑', color: '#06B6D4', isIncome: false },
  { id: 'expense-utilities', icon: '💡', color: '#06B6D4', isIncome: false },

  // Transportation
  { id: 'expense-transport', icon: '🚃', color: '#3B82F6', isIncome: false },
  { id: 'expense-car', icon: '🚗', color: '#3B82F6', isIncome: false },

  // Communication
  { id: 'expense-communication', icon: '📱', color: '#EC4899', isIncome: false },

  // Entertainment
  { id: 'expense-entertainment', icon: '🎮', color: '#F43F5E', isIncome: false },
  { id: 'expense-subscription', icon: '📺', color: '#F43F5E', isIncome: false },

  // Health
  { id: 'expense-health', icon: '🏥', color: '#14B8A6', isIncome: false },

  // Fashion
  { id: 'expense-fashion', icon: '👔', color: '#D946EF', isIncome: false },

  // Education
  { id: 'expense-education', icon: '📚', color: '#6366F1', isIncome: false },

  // Special
  { id: 'expense-special', icon: '⭐', color: '#EAB308', isIncome: false },

  // Insurance & Tax
  { id: 'expense-insurance', icon: '🛡️', color: '#64748B', isIncome: false },
  { id: 'expense-tax', icon: '🏛️', color: '#64748B', isIncome: false },

  // Other
  { id: 'expense-other', icon: '📦', color: '#6B7280', isIncome: false },
  { id: 'expense-uncategorized', icon: '❓', color: '#9CA3AF', isIncome: false },

  // Transfer
  { id: 'transfer', icon: '🔄', color: '#94A3B8', isIncome: false },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryDisplayName(id: string, t: TFunction): string {
  return t(`categories.${id}`);
}
