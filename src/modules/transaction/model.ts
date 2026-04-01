import { t } from 'elysia';

const transactionTypes = t.Union([t.Literal('income'), t.Literal('expense')]);

export const createTransactionBody = t.Object({
  walletId: t.String({ format: 'uuid' }),
  categoryId: t.String({ format: 'uuid' }),
  type: transactionTypes,
  amount: t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' }),
  description: t.Optional(t.String({ maxLength: 500 })),
  transactionDate: t.String({ format: 'date' }),
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
  type: t.Optional(transactionTypes),
  walletId: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  startDate: t.Optional(t.String({ format: 'date' })),
  endDate: t.Optional(t.String({ format: 'date' })),
  page: t.Optional(t.String({ default: '1' })),
  limit: t.Optional(t.String({ default: '20' })),
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
  walletId: t.String(),
  categoryId: t.String(),
  type: t.String(),
  amount: t.String(),
  description: t.Nullable(t.String()),
  transactionDate: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
  attachments: t.Optional(t.Array(attachmentResponse)),
});

export const transactionListResponse = t.Object({
  data: t.Array(transactionResponse),
  meta: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});
