import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { buckets } from '../../db/schema/buckets.ts';
import { NotFoundError } from '../../common/errors.ts';

type CreateBucketInput = {
  name: string;
  type?: string;
  targetAmount?: string;
  icon?: string;
  color?: string;
};

export async function createBucket(userId: string, data: CreateBucketInput) {
  const [row] = await db
    .insert(buckets)
    .values({
      userId,
      name: data.name,
      type: data.type ?? null,
      targetAmount: data.targetAmount ?? null,
      icon: data.icon ?? null,
      color: data.color ?? null,
    })
    .returning();

  return row!;
}

export type BucketWithBalance = {
  id: string;
  name: string;
  type: string | null;
  targetAmount: string | null;
  icon: string | null;
  color: string | null;
  /** Raw SQL (`db.execute`) mengembalikan timestamp sebagai string dari driver Postgres. */
  createdAt: Date | string;
  updatedAt: Date | string;
  balance: string;
};

export async function listBucketsWithBalance(
  userId: string,
): Promise<BucketWithBalance[]> {
  const result = await db.execute(sql`
    SELECT
      b.id,
      b.name,
      b.type,
      b.target_amount,
      b.icon,
      b.color,
      b.created_at,
      b.updated_at,
      COALESCE(
        SUM(
          CASE
            WHEN t.is_allocation_withdraw
              THEN -t.amount::numeric
            ELSE t.amount::numeric
          END
        ),
        0
      )::text AS balance
    FROM buckets b
    LEFT JOIN transactions t
      ON t.bucket_id = b.id
      AND t.type = 'transfer'
    WHERE b.user_id = ${userId}::uuid
    GROUP BY b.id
    ORDER BY b.name
  `);

  const rawRows = result as unknown as {
    id: string;
    name: string;
    type: string | null;
    target_amount: string | null;
    icon: string | null;
    color: string | null;
    created_at: Date | string;
    updated_at: Date | string;
    balance: string;
  }[];

  return rawRows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    targetAmount: r.target_amount,
    icon: r.icon,
    color: r.color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    balance: r.balance,
  }));
}

export async function findBucketOrThrow(userId: string, bucketId: string) {
  const row = await db.query.buckets.findFirst({
    where: and(eq(buckets.id, bucketId), eq(buckets.userId, userId)),
  });
  if (!row) throw new NotFoundError('Bucket');
  return row;
}
