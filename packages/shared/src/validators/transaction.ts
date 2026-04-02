import * as v from 'valibot';

export const TransactionSchema = v.object({
  id: v.string(),
  date: v.string(),
  description: v.string(),
  amount: v.number(),
  currency: v.string(),
  category_id: v.optional(v.string()),
  category_name: v.optional(v.string()),
  account_name: v.optional(v.string()),
  memo: v.optional(v.string()),
  is_transfer: v.boolean(),
});

export type Transaction = v.InferOutput<typeof TransactionSchema>;

export const TransactionListSchema = v.object({
  data: v.array(TransactionSchema),
});
