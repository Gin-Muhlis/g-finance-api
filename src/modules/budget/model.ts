import { t } from 'elysia';

const moneyString = t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' });

const budgetItemUpsert = t.Object({
  categoryId: t.String({ format: 'uuid' }),
  allocatedAmount: moneyString,
});

export const upsertBudgetBody = t.Object({
  year: t.Number({ minimum: 1970, maximum: 2100 }),
  month: t.Number({ minimum: 1, maximum: 12 }),
  totalBudget: t.Optional(t.Nullable(moneyString)),
  items: t.Array(budgetItemUpsert, { minItems: 0 }),
});

export const budgetQuery = t.Object({
  year: t.String(),
  month: t.String(),
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

export const budgetSummaryResponse = t.Object({
  period: t.Object({
    year: t.Number(),
    month: t.Number(),
    startDate: t.String(),
    endDate: t.String(),
  }),
  budget: t.Nullable(budgetInfo),
  items: t.Array(summaryRow),
  totals: t.Object({
    totalAllocated: t.String(),
    totalActual: t.String(),
  }),
});

export const messageResponse = t.Object({
  message: t.String(),
});
