import { t } from 'elysia';

const amountString = t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' });

export const createAllocationBody = t.Object({
  fromWalletId: t.String({ format: 'uuid' }),
  toWalletId: t.String({ format: 'uuid' }),
  bucketId: t.String({ format: 'uuid' }),
  amount: amountString,
  transactionDate: t.String({ format: 'date' }),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const withdrawAllocationBody = t.Object({
  fromWalletId: t.String({ format: 'uuid' }),
  toWalletId: t.String({ format: 'uuid' }),
  bucketId: t.String({ format: 'uuid' }),
  amount: amountString,
  transactionDate: t.Optional(t.String({ format: 'date' })),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const allocationListQuery = t.Object({
  bucketId: t.Optional(t.String({ format: 'uuid' })),
});

export const allocationSummaryResponse = t.Object({
  totalBalance: t.Number(),
  totalAllocated: t.Number(),
  available: t.Number(),
});

const walletRef = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
  balance: t.String(),
  currency: t.String(),
});

const bucketRef = t.Object({
  id: t.String(),
  name: t.String(),
});

export const transferTransactionResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  type: t.Literal('transfer'),
  isAllocationWithdraw: t.Boolean(),
  fromWalletId: t.Nullable(t.String()),
  toWalletId: t.Nullable(t.String()),
  bucketId: t.Nullable(t.String()),
  amount: t.String(),
  description: t.Nullable(t.String()),
  transactionDate: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
  fromWallet: t.Nullable(walletRef),
  toWallet: t.Nullable(walletRef),
  bucket: t.Nullable(bucketRef),
});

export const transferTransactionListResponse = t.Array(
  transferTransactionResponse,
);
