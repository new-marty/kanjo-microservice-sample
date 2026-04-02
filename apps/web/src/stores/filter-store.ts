import { create } from 'zustand';

interface FilterState {
  dateRange: { start: string | null; end: string | null };
  category: string | null;
  setDateRange: (start: string | null, end: string | null) => void;
  setCategory: (category: string | null) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  dateRange: { start: null, end: null },
  category: null,
  setDateRange: (start, end) => set({ dateRange: { start, end } }),
  setCategory: (category) => set({ category }),
  reset: () => set({ dateRange: { start: null, end: null }, category: null }),
}));
