import { t } from 'elysia';

const categoryTypes = t.Union([t.Literal('income'), t.Literal('expense')]);

export const createCategoryBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  type: categoryTypes,
  icon: t.Optional(t.String({ maxLength: 100 })),
  color: t.Optional(t.String({ maxLength: 20 })),
});

export const updateCategoryBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  icon: t.Optional(t.String({ maxLength: 100 })),
  color: t.Optional(t.String({ maxLength: 20 })),
});

export const categoryQuery = t.Object({
  type: t.Optional(categoryTypes),
});

export const categoryResponse = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
  icon: t.Nullable(t.String()),
  color: t.Nullable(t.String()),
  createdAt: t.String(),
});

export const categoryListResponse = t.Array(categoryResponse);
