import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MonthlySummary } from './monthly-summary';
import { formatYen } from '@repo/shared';

afterEach(cleanup);

vi.mock('@/stores/preferences-store', () => ({
  usePreferencesStore: () => ({ balanceVisible: true }),
}));

describe('MonthlySummary', () => {
  it('renders income, expenses, and savings labels', () => {
    render(<MonthlySummary income={300000} expenses={125000} saved={175000} savingsRate={58.3} />);

    expect(screen.getByText('dashboard.income')).toBeInTheDocument();
    expect(screen.getByText('dashboard.expenses')).toBeInTheDocument();
    expect(screen.getByText('dashboard.savings')).toBeInTheDocument();
  });

  it('renders formatted yen values', () => {
    render(<MonthlySummary income={300000} expenses={125000} saved={175000} savingsRate={58.3} />);

    expect(screen.getByText(formatYen(300000))).toBeInTheDocument();
    expect(screen.getByText(formatYen(125000))).toBeInTheDocument();
    expect(screen.getByText(formatYen(175000))).toBeInTheDocument();
  });

  it('renders savings rate', () => {
    render(<MonthlySummary income={300000} expenses={125000} saved={175000} savingsRate={58.3} />);

    expect(screen.getByText('dashboard.savingsRate')).toBeInTheDocument();
  });
});
