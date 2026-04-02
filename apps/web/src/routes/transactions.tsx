import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/error-boundary';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { useTranslation } from 'react-i18next';
import { TransactionFilters } from '@/components/transactions/transaction-filters';
import { TransactionTable } from '@/components/transactions/transaction-table';

export const Route = createFileRoute('/transactions')({
  component: Transactions,
  errorComponent: ErrorBoundary,
});

function Transactions() {
  const { t } = useTranslation();
  return (
    <NuqsAdapter>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('transactions.title')}</h1>
          <p className="text-muted-foreground">{t('transactions.description')}</p>
        </div>
        <TransactionFilters />
        <TransactionTable />
      </div>
    </NuqsAdapter>
  );
}
