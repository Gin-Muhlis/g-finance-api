import Elysia, { t } from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import {
  createCategoryBody,
  updateCategoryBody,
  categoryQuery,
  categoryResponse,
  categoryListResponse,
} from './model.ts';
import { messageResponse } from '../auth/model.ts';
import * as categoryService from './service.ts';

function formatCategory(categoryRecord: {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  createdAt: Date;
}) {
  return {
    id: categoryRecord.id,
    name: categoryRecord.name,
    type: categoryRecord.type,
    icon: categoryRecord.icon,
    color: categoryRecord.color,
    createdAt: categoryRecord.createdAt.toISOString(),
  };
}

export const categoryModule = new Elysia({ prefix: '/categories' })
  .use(authGuard)
  .get(
    '/',
    async ({ userId, query }) => {
      const page = Math.max(1, parseInt(query.page ?? '1'));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));

      const result = await categoryService.listCategories(userId, {
        type: query.type as 'income' | 'expense' | 'allocation',
        page,
        limit,
      });

      return {
        data: result.data.map(formatCategory),
        meta: result.meta,
      };
    },
    {
      query: categoryQuery,
      response: categoryListResponse,
      detail: {
        tags: ['Categories'],
        summary: 'List categories with filters and pagination',
      },
    },
  )
  .post(
    '/',
    async ({ userId, body }) => {
      const category = await categoryService.createCategory(userId, body);
      return formatCategory(category);
    },
    {
      body: createCategoryBody,
      response: categoryResponse,
      detail: { tags: ['Categories'], summary: 'Create a new category' },
    },
  )
  .put(
    '/:id',
    async ({ userId, params, body }) => {
      const category = await categoryService.updateCategory(
        params.id,
        userId,
        body,
      );
      return formatCategory(category);
    },
    {
      params: t.Object({ id: t.String() }),
      body: updateCategoryBody,
      response: categoryResponse,
      detail: { tags: ['Categories'], summary: 'Update category' },
    },
  )
  .delete(
    '/:id',
    async ({ userId, params }) => {
      await categoryService.deleteCategory(params.id, userId);
      return { message: 'Category deleted successfully' };
    },
    {
      params: t.Object({ id: t.String() }),
      response: messageResponse,
      detail: { tags: ['Categories'], summary: 'Delete category' },
    },
  );
