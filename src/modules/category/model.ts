import { t } from 'elysia';

const categoryTypes = t.Union([
  t.Literal('income'),
  t.Literal('expense'),
  t.Literal('allocation'),
]);

export const createCategoryBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  type: categoryTypes,
  icon: t.Optional(
    t.String({
      maxLength: 100,
      description:
        'Lucide Vue (lucide-vue-next) icon component name in PascalCase, e.g. Wallet, CircleDollarSign',
    }),
  ),
  color: t.Optional(t.String({ maxLength: 20 })),
});

export const updateCategoryBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  icon: t.Optional(
    t.String({
      maxLength: 100,
      description:
        'Lucide Vue (lucide-vue-next) icon component name in PascalCase',
    }),
  ),
  color: t.Optional(t.String({ maxLength: 20 })),
});

export const categoryQuery = t.Object({
  type: t.Optional(categoryTypes),
  page: t.Optional(t.String({ default: '1' })),
  limit: t.Optional(t.String({ default: '20' })),
});

export const categoryResponse = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
  icon: t.Nullable(t.String()),
  color: t.Nullable(t.String()),
  createdAt: t.String(),
});

export const categoryListResponse = t.Object({
  data: t.Array(categoryResponse),
  meta: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});
