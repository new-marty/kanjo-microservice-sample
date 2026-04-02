import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface PreferencesState {
  balanceVisible: boolean;
  toggleBalanceVisibility: () => void;
  setBalanceVisible: (visible: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      balanceVisible: true,
      toggleBalanceVisibility: () => set((state) => ({ balanceVisible: !state.balanceVisible })),
      setBalanceVisible: (visible) => set({ balanceVisible: visible }),
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'kanjo-preferences',
    }
  )
);
