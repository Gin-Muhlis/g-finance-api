import Elysia, { t } from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import {
  budgetQuery,
  budgetSummaryResponse,
  upsertBudgetBody,
  messageResponse,
} from './model.ts';
import * as budgetService from './service.ts';
import { NotFoundError, ValidationError } from '../../common/errors.ts';

export const budgetModule = new Elysia({ prefix: '/budgets' })
  .use(authGuard)
  .get(
    '/',
    async ({ userId, query }) => {
      const year = parseInt(query.year, 10);
      const month = parseInt(query.month, 10);
      if (Number.isNaN(year) || Number.isNaN(month)) {
        throw new ValidationError('year and month must be valid numbers');
      }
      return budgetService.getBudgetSummary(userId, year, month);
    },
    {
      query: budgetQuery,
      response: budgetSummaryResponse,
      detail: {
        tags: ['Budgets'],
        summary:
          'Get monthly budget vs actuals (all expense categories, one aggregate query for spending)',
      },
    },
  )
  .put(
    '/',
    async ({ userId, body }) => {
      return budgetService.upsertBudget(userId, {
        year: body.year,
        month: body.month,
        totalBudget: body.totalBudget,
        items: body.items,
      });
    },
    {
      body: upsertBudgetBody,
      response: budgetSummaryResponse,
      detail: {
        tags: ['Budgets'],
        summary: 'Create or replace budget for a month (expense categories only)',
      },
    },
  )
  .delete(
    '/:id',
    async ({ userId, params }) => {
      const ok = await budgetService.deleteBudget(userId, params.id);
      if (!ok) throw new NotFoundError('Budget');
      return { message: 'Budget deleted successfully' };
    },
    {
      params: t.Object({ id: t.String() }),
      response: messageResponse,
      detail: {
        tags: ['Budgets'],
        summary: 'Delete a monthly budget and its line items',
      },
    },
  );
