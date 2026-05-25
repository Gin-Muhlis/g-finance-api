import Elysia, { t } from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import {
  createBucketBody,
  createBucketResponse,
  bucketListResponse,
  updateBucketBody,
  messageResponse,
} from './model.ts';
import * as bucketService from './service.ts';

/** Drizzle `insert.returning` pakai `Date`; raw `db.execute` dari Postgres sering string. */
function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function formatCreatedBucket(b: Awaited<ReturnType<typeof bucketService.createBucket>>) {
  return {
    id: b.id,
    userId: b.userId,
    name: b.name,
    type: b.type,
    targetAmount: b.targetAmount,
    icon: b.icon,
    color: b.color,
    createdAt: toIso(b.createdAt),
    updatedAt: toIso(b.updatedAt),
  };
}

function formatBucketWithBalance(
  b: Awaited<
    ReturnType<typeof bucketService.listBucketsWithBalance>
  >[number],
) {
  return {
    id: b.id,
    name: b.name,
    type: b.type,
    targetAmount: b.targetAmount,
    icon: b.icon,
    color: b.color,
    createdAt: toIso(b.createdAt),
    updatedAt: toIso(b.updatedAt),
    balance: b.balance,
  };
}

export const bucketModule = new Elysia({ prefix: '/buckets' })
  .use(authGuard)
  .get(
    '/',
    async ({ userId }) => {
      const rows = await bucketService.listBucketsWithBalance(userId);
      return rows.map(formatBucketWithBalance);
    },
    {
      response: bucketListResponse,
      detail: {
        tags: ['Buckets'],
        summary: 'List saving buckets with aggregate balance (transfer ledger)',
      },
    },
  )
  .post(
    '/',
    async ({ userId, body }) => {
      const bucket = await bucketService.createBucket(userId, {
        name: body.name,
        type: body.type,
        targetAmount: body.targetAmount,
        icon: body.icon,
        color: body.color,
      });
      return formatCreatedBucket(bucket);
    },
    {
      body: createBucketBody,
      response: createBucketResponse,
      detail: { tags: ['Buckets'], summary: 'Create a bucket' },
    },
  )
  .put(
    '/:id',
    async ({ userId, params, body }) => {
      const bucket = await bucketService.updateBucket(userId, params.id, {
        name: body.name,
        type: body.type,
        targetAmount: body.targetAmount,
        icon: body.icon,
        color: body.color,
      });
      return formatCreatedBucket(bucket);
    },
    {
      params: t.Object({ id: t.String() }),
      body: updateBucketBody,
      response: createBucketResponse,
      detail: { tags: ['Buckets'], summary: 'Update bucket' },
    },
  )
  .delete(
    '/:id',
    async ({ userId, params }) => {
      await bucketService.deleteBucket(userId, params.id);
      return { message: 'Bucket deleted successfully' };
    },
    {
      params: t.Object({ id: t.String() }),
      response: messageResponse,
      detail: { tags: ['Buckets'], summary: 'Delete bucket' },
    },
  );
