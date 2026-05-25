import { t } from 'elysia';

export const createBucketBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  type: t.Optional(t.String({ maxLength: 50 })),
  targetAmount: t.Optional(
    t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' }),
  ),
  icon: t.Optional(t.String({ maxLength: 100 })),
  color: t.Optional(t.String({ maxLength: 20 })),
});

export const bucketWithBalanceResponse = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.Nullable(t.String()),
  targetAmount: t.Nullable(t.String()),
  icon: t.Nullable(t.String()),
  color: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
  balance: t.String(),
});

export const bucketListResponse = t.Array(bucketWithBalanceResponse);

export const createBucketResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  name: t.String(),
  type: t.Nullable(t.String()),
  targetAmount: t.Nullable(t.String()),
  icon: t.Nullable(t.String()),
  color: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const updateBucketBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  type: t.Optional(t.String({ maxLength: 50 })),
  targetAmount: t.Optional(
    t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' }),
  ),
  icon: t.Optional(t.String({ maxLength: 100 })),
  color: t.Optional(t.String({ maxLength: 20 })),
});

export const messageResponse = t.Object({
  message: t.String(),
});
