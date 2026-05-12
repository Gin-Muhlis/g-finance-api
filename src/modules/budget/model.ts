import { t } from 'elysia';

const nonNegativeMoney = t.Number({
  minimum: 0,
  description: 'Non-negative amount; up to two decimal places recommended',
});

/** Total budget bulanan — wajib, tidak boleh null/0/kosong. */
const positiveTotalBudget = t.Number({
  exclusiveMinimum: 0,
  description: 'Total budget harus berupa bilangan lebih dari 0',
});

const budgetItemUpsert = t.Object({
  categoryId: t.String({ format: 'uuid' }),
  allocatedAmount: nonNegativeMoney,
});

export const upsertBudgetBody = t.Object({
  year: t.Number({ minimum: 1970, maximum: 2100 }),
  month: t.Number({ minimum: 1, maximum: 12 }),
  totalBudget: positiveTotalBudget,
  items: t.Array(budgetItemUpsert, { minItems: 0 }),
});

export const budgetQuery = t.Object({
  year: t.String(),
  month: t.String(),
});

/** Query GET /budgets/items — pagination + period. */
export const budgetCategoryItemsQuery = t.Object({
  year: t.String(),
  month: t.String(),
  page: t.Optional(t.String({ default: '1' })),
  limit: t.Optional(t.String({ default: '10' })),
});

const categoryInSummary = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
  icon: t.Nullable(t.String()),
  color: t.Nullable(t.String()),
  createdAt: t.String(),
});

const summaryRow = t.Object({
  category: categoryInSummary,
  hasBudget: t.Boolean(),
  allocatedAmount: t.Nullable(t.String()),
  actualAmount: t.String(),
  remaining: t.Nullable(t.String()),
  progressPercent: t.Nullable(t.Number()),
  isOverBudget: t.Boolean(),
});

const budgetInfo = t.Object({
  id: t.String(),
  totalBudget: t.Nullable(t.String()),
  createdAt: t.String(),
});

/** Ringkasan bulanan tanpa daftar perkategori. */
export const budgetSummaryResponse = t.Object({
  period: t.Object({
    year: t.Number(),
    month: t.Number(),
    startDate: t.String(),
    endDate: t.String(),
  }),
  budget: t.Nullable(budgetInfo),
  totals: t.Object({
    totalAllocated: t.String(),
    totalActual: t.String(),
  }),
});

/** GET /budgets/items — perkategori + meta pagination. */
export const budgetCategoryItemsResponse = t.Object({
  period: t.Object({
    year: t.Number(),
    month: t.Number(),
    startDate: t.String(),
    endDate: t.String(),
  }),
  pagination: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
  items: t.Array(summaryRow),
});

export const messageResponse = t.Object({
  message: t.String(),
});
