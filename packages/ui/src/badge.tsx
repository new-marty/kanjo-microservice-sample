import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function Badge({ children, variant: _variant = 'default' }: BadgeProps) {
  return <span>{children}</span>;
}
