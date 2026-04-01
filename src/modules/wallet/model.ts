import { t } from 'elysia';

const walletTypes = t.Union([
  t.Literal('bank'),
  t.Literal('e-wallet'),
  t.Literal('cash'),
  t.Literal('savings'),
  t.Literal('investment'),
]);

export const createWalletBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  type: walletTypes,
  balance: t.Optional(t.String({ default: '0' })),
  currency: t.Optional(t.String({ default: 'IDR', maxLength: 10 })),
  icon: t.Optional(t.String({ maxLength: 100 })),
});

export const updateWalletBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  type: t.Optional(walletTypes),
  currency: t.Optional(t.String({ maxLength: 10 })),
  icon: t.Optional(t.String({ maxLength: 100 })),
  isActive: t.Optional(t.Boolean()),
});

export const walletResponse = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
  balance: t.String(),
  currency: t.String(),
  icon: t.Nullable(t.String()),
  isActive: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const walletListResponse = t.Array(walletResponse);
