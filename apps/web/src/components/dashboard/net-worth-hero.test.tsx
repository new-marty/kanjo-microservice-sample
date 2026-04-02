import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NetWorthHero } from './net-worth-hero';
import { formatYen } from '@repo/shared';

afterEach(cleanup);

vi.mock('@/stores/preferences-store', () => ({
  usePreferencesStore: () => ({ balanceVisible: true }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  YAxis: () => null,
}));

describe('NetWorthHero', () => {
  const defaultProps = {
    current: 4550000,
    previousMonth: 4500000,
    sparklineData: [
      { date: '2026-01-01', value: 4400000 },
      { date: '2026-02-01', value: 4550000 },
    ],
  };

  it('renders net worth label', () => {
    render(<NetWorthHero {...defaultProps} />);
    expect(screen.getByText('dashboard.netWorth')).toBeInTheDocument();
  });

  it('renders formatted current value', () => {
    render(<NetWorthHero {...defaultProps} />);
    expect(screen.getByText(formatYen(4550000))).toBeInTheDocument();
  });

  it('renders change percentage', () => {
    render(<NetWorthHero {...defaultProps} />);
    expect(screen.getByText(/1\.1%/)).toBeInTheDocument();
  });

  it('renders negative change', () => {
    render(<NetWorthHero {...defaultProps} current={4400000} previousMonth={4500000} />);
    expect(screen.getByText(/2\.2%/)).toBeInTheDocument();
  });
});
