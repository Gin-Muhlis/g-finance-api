import { t } from 'elysia';

const transactionTypes = t.Union([t.Literal('income'), t.Literal('expense')]);
const transactionListTypes = t.Union([
  t.Literal('income'),
  t.Literal('expense'),
  t.Literal('transfer'),
]);

export const createTransactionBody = t.Object({
  walletId: t.String({ format: 'uuid' }),
  categoryId: t.String({ format: 'uuid' }),
  type: transactionTypes,
  amount: t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' }),
  description: t.Optional(t.String({ maxLength: 500 })),
  transactionDate: t.String({ format: 'date' }),
});

export const walletTransferBody = t.Object({
  fromWalletId: t.String({ format: 'uuid' }),
  toWalletId: t.String({ format: 'uuid' }),
  amount: t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' }),
  transactionDate: t.String({ format: 'date' }),
  description: t.Optional(t.String({ maxLength: 500 })),
});

export const updateTransactionBody = t.Object({
  walletId: t.Optional(t.String({ format: 'uuid' })),
  categoryId: t.Optional(t.String({ format: 'uuid' })),
  type: t.Optional(transactionTypes),
  amount: t.Optional(t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' })),
  description: t.Optional(t.String({ maxLength: 500 })),
  transactionDate: t.Optional(t.String({ format: 'date' })),
});

export const transactionQuery = t.Object({
  type: t.Optional(transactionListTypes),
  walletId: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  startDate: t.String({ format: 'date' }),
  endDate: t.String({ format: 'date' }),
});

export const recentTransactionQuery = t.Object({
  type: t.Optional(transactionListTypes),
  walletId: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  search: t.Optional(t.String()),
  limit: t.Optional(t.String({ default: '5' })),
});

const attachmentResponse = t.Object({
  id: t.String(),
  filePath: t.String(),
  fileName: t.String(),
  mimeType: t.String(),
  fileSize: t.Number(),
  createdAt: t.String(),
});

export const transactionResponse = t.Object({
  id: t.String(),
  walletId: t.Nullable(t.String()),
  categoryId: t.Nullable(t.String()),
  fromWalletId: t.Optional(t.Nullable(t.String())),
  toWalletId: t.Optional(t.Nullable(t.String())),
  bucketId: t.Optional(t.Nullable(t.String())),
  isAllocationWithdraw: t.Optional(t.Boolean()),
  walletName: t.Nullable(t.String()),
  categoryName: t.Nullable(t.String()),
  type: t.String(),
  amount: t.String(),
  description: t.Nullable(t.String()),
  transactionDate: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
  attachments: t.Optional(t.Array(attachmentResponse)),
});

const categoryInListResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  name: t.String(),
  type: t.String(),
  icon: t.Nullable(t.String()),
  color: t.Nullable(t.String()),
  createdAt: t.String(),
});

const walletInListResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  name: t.String(),
  type: t.String(),
  balance: t.String(),
  currency: t.String(),
  icon: t.Nullable(t.String()),
  isActive: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const transactionListItemResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  walletId: t.Nullable(t.String()),
  categoryId: t.Nullable(t.String()),
  fromWalletId: t.Optional(t.Nullable(t.String())),
  toWalletId: t.Optional(t.Nullable(t.String())),
  bucketId: t.Optional(t.Nullable(t.String())),
  isAllocationWithdraw: t.Optional(t.Boolean()),
  type: t.String(),
  amount: t.String(),
  description: t.Nullable(t.String()),
  transactionDate: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
  categoryName: t.Nullable(t.String()),
  walletName: t.Nullable(t.String()),
  category: t.Nullable(categoryInListResponse),
  wallet: t.Nullable(walletInListResponse),
  fromWallet: t.Optional(t.Nullable(walletInListResponse)),
  toWallet: t.Optional(t.Nullable(walletInListResponse)),
});

const transactionsByDayGroup = t.Object({
  transactionDate: t.String(),
  transactions: t.Array(transactionListItemResponse),
});

export const transactionListResponse = t.Object({
  transactionsByDay: t.Array(transactionsByDayGroup),
  totalIncome: t.String(),
  totalExpense: t.String(),
});

export const recentTransactionListResponse = t.Array(transactionListItemResponse);
