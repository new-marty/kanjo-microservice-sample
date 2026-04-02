import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './error-boundary';

afterEach(cleanup);

describe('ErrorBoundary', () => {
  it('renders error title and message', () => {
    const error = new Error('Something went wrong');
    const reset = vi.fn();

    render(<ErrorBoundary error={error} reset={reset} info={{ componentStack: '' }} />);

    expect(screen.getByText('error.title')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders retry button', () => {
    const error = new Error('fail');
    const reset = vi.fn();

    render(<ErrorBoundary error={error} reset={reset} info={{ componentStack: '' }} />);

    expect(screen.getByRole('button', { name: 'error.retry' })).toBeInTheDocument();
  });
});
