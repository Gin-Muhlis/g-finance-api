import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { buckets } from '../../db/schema/buckets.ts';
import { transactions } from '../../db/schema/transactions.ts';
import { wallets } from '../../db/schema/wallets.ts';
import { NotFoundError, ValidationError } from '../../common/errors.ts';
import { recalculateWalletBalance } from '../transaction/service.ts';

function parseAmount(amount: string): number {
  const n = parseFloat(amount);
  if (Number.isNaN(n) || n <= 0) return Number.NaN;
  return n;
}

async function getBucketNetBalanceInTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  bucketId: string,
): Promise<number> {
  const [row] = await tx
    .select({
      total: sql<string>`COALESCE(
        SUM(
          CASE
            WHEN ${transactions.isAllocationWithdraw}
              THEN -${transactions.amount}::numeric
            ELSE ${transactions.amount}::numeric
          END
        ),
        0
      )::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.bucketId, bucketId),
        eq(transactions.type, 'transfer'),
      ),
    );
  return parseFloat(row?.total ?? '0');
}

export async function createAllocation(
  userId: string,
  data: {
    fromWalletId: string;
    toWalletId: string;
    bucketId: string;
    amount: string;
    transactionDate: string;
    description?: string;
  },
) {
  if (data.fromWalletId === data.toWalletId) {
    throw new ValidationError('Cannot transfer to same wallet');
  }
  const amountNum = parseAmount(data.amount);
  if (Number.isNaN(amountNum)) {
    throw new ValidationError('Invalid amount');
  }

  return await db.transaction(async (tx) => {
    const [fromWallet, toWallet, bucket] = await Promise.all([
      tx.query.wallets.findFirst({
        where: and(
          eq(wallets.id, data.fromWalletId),
          eq(wallets.userId, userId),
          isNull(wallets.deletedAt),
        ),
      }),
      tx.query.wallets.findFirst({
        where: and(
          eq(wallets.id, data.toWalletId),
          eq(wallets.userId, userId),
          isNull(wallets.deletedAt),
        ),
      }),
      tx.query.buckets.findFirst({
        where: and(eq(buckets.id, data.bucketId), eq(buckets.userId, userId)),
      }),
    ]);

    if (!fromWallet || !toWallet) {
      throw new ValidationError('Wallet not found');
    }
    if (!bucket) throw new NotFoundError('Bucket');
    if (parseFloat(String(fromWallet.balance)) < amountNum) {
      throw new ValidationError('Insufficient balance');
    }

    const [row] = await tx
      .insert(transactions)
      .values({
        userId,
        type: 'transfer',
        isAllocationWithdraw: false,
        fromWalletId: data.fromWalletId,
        toWalletId: data.toWalletId,
        bucketId: data.bucketId,
        amount: data.amount,
        transactionDate: data.transactionDate,
        description: data.description ?? null,
        walletId: null,
        categoryId: null,
        walletName: null,
        categoryName: null,
      })
      .returning();

    await recalculateWalletBalance(data.fromWalletId, tx);
    await recalculateWalletBalance(data.toWalletId, tx);

    return row!;
  });
}

export async function withdrawFromBucket(
  userId: string,
  data: {
    fromWalletId: string;
    toWalletId: string;
    bucketId: string;
    amount: string;
    transactionDate?: string;
    description?: string;
  },
) {
  if (data.fromWalletId === data.toWalletId) {
    throw new ValidationError('Cannot transfer to same wallet');
  }
  const amountNum = parseAmount(data.amount);
  if (Number.isNaN(amountNum)) {
    throw new ValidationError('Invalid amount');
  }

  const today = new Date().toISOString().slice(0, 10);
  const transactionDate = data.transactionDate ?? today;

  return await db.transaction(async (tx) => {
    const [fromWallet, toWallet, bucket] = await Promise.all([
      tx.query.wallets.findFirst({
        where: and(
          eq(wallets.id, data.fromWalletId),
          eq(wallets.userId, userId),
          isNull(wallets.deletedAt),
        ),
      }),
      tx.query.wallets.findFirst({
        where: and(
          eq(wallets.id, data.toWalletId),
          eq(wallets.userId, userId),
          isNull(wallets.deletedAt),
        ),
      }),
      tx.query.buckets.findFirst({
        where: and(eq(buckets.id, data.bucketId), eq(buckets.userId, userId)),
      }),
    ]);

    if (!fromWallet || !toWallet) {
      throw new ValidationError('Wallet not found');
    }
    if (!bucket) throw new NotFoundError('Bucket');
    if (parseFloat(String(fromWallet.balance)) < amountNum) {
      throw new ValidationError('Insufficient balance');
    }

    const bucketNet = await getBucketNetBalanceInTx(tx, userId, data.bucketId);
    if (bucketNet < amountNum) {
      throw new ValidationError('Insufficient bucket balance');
    }

    const [row] = await tx
      .insert(transactions)
      .values({
        userId,
        type: 'transfer',
        isAllocationWithdraw: true,
        fromWalletId: data.fromWalletId,
        toWalletId: data.toWalletId,
        bucketId: data.bucketId,
        amount: data.amount,
        transactionDate,
        description: data.description ?? null,
        walletId: null,
        categoryId: null,
        walletName: null,
        categoryName: null,
      })
      .returning();

    await recalculateWalletBalance(data.fromWalletId, tx);
    await recalculateWalletBalance(data.toWalletId, tx);

    return row!;
  });
}

export async function getAllocationSummary(userId: string) {
  const [walletRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${wallets.balance}::numeric), 0)::text`,
    })
    .from(wallets)
    .where(and(eq(wallets.userId, userId), isNull(wallets.deletedAt)));

  const [allocatedRow] = await db
    .select({
      total: sql<string>`COALESCE(
        SUM(
          CASE
            WHEN ${transactions.isAllocationWithdraw}
              THEN -${transactions.amount}::numeric
            ELSE ${transactions.amount}::numeric
          END
        ),
        0
      )::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNotNull(transactions.bucketId),
        eq(transactions.type, 'transfer'),
      ),
    );

  const totalBalance = parseFloat(walletRow?.total ?? '0');
  const totalAllocated = parseFloat(allocatedRow?.total ?? '0');

  return {
    totalBalance,
    totalAllocated,
    available: totalBalance - totalAllocated,
  };
}

export async function listAllocations(
  userId: string,
  opts: { bucketId?: string },
) {
  const conditions = [
    eq(transactions.userId, userId),
    eq(transactions.type, 'transfer'),
    isNotNull(transactions.bucketId),
  ];
  if (opts.bucketId) {
    conditions.push(eq(transactions.bucketId, opts.bucketId));
  }

  return db.query.transactions.findMany({
    where: and(...conditions),
    with: {
      fromWallet: true,
      toWallet: true,
      bucket: true,
    },
    orderBy: [desc(transactions.transactionDate), desc(transactions.createdAt)],
  });
}
