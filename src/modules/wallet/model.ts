import { t } from 'elysia';

const walletTypes = t.Union([
  t.Literal('bank'),
  t.Literal('e-wallet'),
  t.Literal('cash'),
  t.Literal('savings'),
  t.Literal('investment'),
]);

export const walletListQuery = t.Object({
  type: t.Optional(walletTypes),
});

export const createWalletBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  type: walletTypes,
  balance: t.Optional(
    t.Number({
      minimum: 0,
      default: 0,
      description: 'Initial balance (numeric)',
    }),
  ),
  currency: t.Optional(t.String({ default: 'IDR', maxLength: 10 })),
  icon: t.Optional(
    t.String({
      maxLength: 100,
      description:
        'Lucide Vue (lucide-vue-next) icon component name in PascalCase, e.g. Landmark, Wallet',
    }),
  ),
});

export const updateWalletBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  type: t.Optional(walletTypes),
  balance: t.Optional(
    t.Number({ minimum: 0, description: 'Override wallet balance (numeric)' }),
  ),
  currency: t.Optional(t.String({ maxLength: 10 })),
  icon: t.Optional(
    t.String({
      maxLength: 100,
      description:
        'Lucide Vue (lucide-vue-next) icon component name in PascalCase',
    }),
  ),
  isActive: t.Optional(t.Boolean()),
});

export const walletResponse = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
  balance: t.Number(),
  currency: t.String(),
  icon: t.Nullable(t.String()),
  isActive: t.Boolean(),
  deletedAt: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const walletListResponse = t.Array(walletResponse);
