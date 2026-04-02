export interface TransactionSummary {
  totalIncome: number;
  totalSpending: number;
  netAmount: number;
  transactionCount: number;
}

export function calculateTransactionSummary(
  transactions: { amount: number }[]
): TransactionSummary {
  let totalIncome = 0;
  let totalSpending = 0;

  for (const tx of transactions) {
    if (tx.amount > 0) {
      totalIncome += tx.amount;
    } else {
      totalSpending += tx.amount;
    }
  }

  return {
    totalIncome,
    totalSpending,
    netAmount: totalIncome + totalSpending,
    transactionCount: transactions.length,
  };
}
