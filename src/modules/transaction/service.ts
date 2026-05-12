import { eq, and, or, gte, lte, sql, desc, isNull, inArray } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { transactions } from '../../db/schema/transactions.ts';
import { transactionAttachments } from '../../db/schema/transaction-attachments.ts';
import { wallets } from '../../db/schema/wallets.ts';
import { categories } from '../../db/schema/categories.ts';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../common/errors.ts';
import {
  saveFile,
  deleteFile,
  type UploadResult,
} from '../../utils/file-upload.ts';

function parsePositiveAmount(amount: string): number {
  const n = parseFloat(amount);
  if (Number.isNaN(n) || n <= 0) return Number.NaN;
  return n;
}

type TransactionType = 'income' | 'expense';

/** `db` atau `tx` dari `db.transaction` (keduanya punya `.query` / `.select` / …). */
type DbOrTransaction =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function validateTransactionCategory(
  userId: string,
  categoryId: string,
  transactionType: TransactionType,
  client: DbOrTransaction = db,
) {
  const category = await client.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      eq(categories.userId, userId),
      isNull(categories.deletedAt),
    ),
  });
  if (!category) throw new ValidationError('Invalid category');
  if (category.type !== transactionType) {
    throw new ValidationError('Category type must match transaction type');
  }
  return category;
}

async function findTransactionOrFail(transactionId: string, userId: string) {
  const transaction = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
    with: { transactionAttachments: true },
  });

  if (!transaction) throw new NotFoundError('Transaction');
  if (transaction.userId !== userId) throw new ForbiddenError();

  return transaction;
}

/**
 * Net pengaruh transaksi terhadap dompet: income − expense + transfer masuk − transfer keluar.
 */
export async function computeWalletLedgerNet(
  walletId: string,
  client: DbOrTransaction = db,
): Promise<number> {
  const [incomeResult] = await client
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)::text`,
    })
    .from(transactions)
    .where(
      and(eq(transactions.walletId, walletId), eq(transactions.type, 'income')),
    );

  const [expenseResult] = await client
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.walletId, walletId),
        eq(transactions.type, 'expense'),
      ),
    );

  const [transferInResult] = await client
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.toWalletId, walletId),
        eq(transactions.type, 'transfer'),
      ),
    );

  const [transferOutResult] = await client
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.fromWalletId, walletId),
        eq(transactions.type, 'transfer'),
      ),
    );

  const totalIncome = parseFloat(incomeResult?.total ?? '0');
  const totalExpense = parseFloat(expenseResult?.total ?? '0');
  const transferIn = parseFloat(transferInResult?.total ?? '0');
  const transferOut = parseFloat(transferOutResult?.total ?? '0');

  return totalIncome - totalExpense + transferIn - transferOut;
}

/**
 * Saldo dompet = balanceBaseline + net transaksi.
 * Baseline menampung saldo awal saat buat dompet dan penyesuaian manual (tanpa baris transaksi).
 */
export async function recalculateWalletBalance(
  walletId: string,
  client: DbOrTransaction = db,
) {
  const wallet = await client.query.wallets.findFirst({
    where: eq(wallets.id, walletId),
  });
  if (!wallet) return;

  const rawBaseline = parseFloat(String(wallet.balanceBaseline ?? '0'));
  const baseline = Number.isFinite(rawBaseline) ? rawBaseline : 0;
  const net = await computeWalletLedgerNet(walletId, client);
  const balance = (baseline + net).toFixed(2);

  await client.update(wallets).set({ balance }).where(eq(wallets.id, walletId));
}

interface ListOptions {
  type?: TransactionType;
  walletId?: string;
  categoryId?: string;
  startDate: string;
  endDate: string;
}

function listTransactionsWhere(userId: string, opts: ListOptions) {
  /** Transfer alokasi memakai `bucketId`; transfer dompet (tanpa bucket) memakai `bucketId` null. */
  const typeScope = opts.type
    ? eq(transactions.type, opts.type)
    : or(
        inArray(transactions.type, ['income', 'expense']),
        and(eq(transactions.type, 'transfer'), isNull(transactions.bucketId)),
      );

  const conditions = [
    eq(transactions.userId, userId),
    gte(transactions.transactionDate, opts.startDate),
    lte(transactions.transactionDate, opts.endDate),
    typeScope,
  ];

  if (opts.type) conditions.push(eq(transactions.type, opts.type));
  if (opts.walletId) conditions.push(eq(transactions.walletId, opts.walletId));
  if (opts.categoryId)
    conditions.push(eq(transactions.categoryId, opts.categoryId));

  return and(...conditions);
}

function toDateKey(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function groupTransactionsByDay<T extends { transactionDate: string | Date }>(
  rows: T[],
) {
  const byDay = new Map<string, T[]>();
  for (const row of rows) {
    const dateKey = toDateKey(row.transactionDate);
    const existing = byDay.get(dateKey);
    if (existing) existing.push(row);
    else byDay.set(dateKey, [row]);
  }
  const sortedDays = [...byDay.keys()].sort((left, right) =>
    right.localeCompare(left),
  );
  return sortedDays.map((transactionDate) => ({
    transactionDate,
    transactions: byDay.get(transactionDate)!,
  }));
}

function formatSumAmount(raw: string | null | undefined): string {
  const parsed = parseFloat(String(raw ?? '0'));
  if (Number.isNaN(parsed)) return '0.00';
  return parsed.toFixed(2);
}

export async function listTransactions(userId: string, opts: ListOptions) {
  if (opts.startDate > opts.endDate) {
    throw new ValidationError('startDate must be on or before endDate');
  }

  const where = listTransactionsWhere(userId, opts);

  const [transactionRows, incomeRow, expenseRow] = await Promise.all([
    db.query.transactions.findMany({
      where,
      with: { wallet: true, category: true, fromWallet: true, toWallet: true },
      orderBy: [
        desc(transactions.transactionDate),
        desc(transactions.createdAt),
      ],
    }),
    db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)::text`,
      })
      .from(transactions)
      .where(and(where, eq(transactions.type, 'income'))),
    db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)::text`,
      })
      .from(transactions)
      .where(and(where, eq(transactions.type, 'expense'))),
  ]);

  return {
    transactionsByDay: groupTransactionsByDay(transactionRows),
    totalIncome: formatSumAmount(incomeRow[0]?.total),
    totalExpense: formatSumAmount(expenseRow[0]?.total),
  };
}

export async function getTransaction(transactionId: string, userId: string) {
  return findTransactionOrFail(transactionId, userId);
}

export async function createTransaction(
  userId: string,
  data: {
    walletId: string;
    categoryId: string;
    type: TransactionType;
    amount: string;
    description?: string;
    transactionDate: string;
  },
) {
  return await db.transaction(async (tx) => {
    const wallet = await tx.query.wallets.findFirst({
      where: and(
        eq(wallets.id, data.walletId),
        eq(wallets.userId, userId),
        isNull(wallets.deletedAt),
      ),
    });
    if (!wallet) {
      throw new ValidationError('Invalid wallet');
    }

    const category = await validateTransactionCategory(
      userId,
      data.categoryId,
      data.type,
      tx,
    );

    const [createdTransaction] = await tx
      .insert(transactions)
      .values({
        userId,
        walletId: data.walletId,
        categoryId: data.categoryId,
        walletName: wallet.name,
        categoryName: category.name,
        type: data.type,
        amount: data.amount,
        description: data.description ?? null,
        transactionDate: data.transactionDate,
      })
      .returning();

    // Saldo = balanceBaseline + net transaksi; transaksi baru sudah terhitung dalam DB yang sama.
    await recalculateWalletBalance(data.walletId, tx);

    return { ...createdTransaction!, transactionAttachments: [] };
  });
}

/**
 * Transfer saldo antar dompet tanpa alokasi bucket (`bucketId` null).
 */
export async function createWalletTransfer(
  userId: string,
  data: {
    fromWalletId: string;
    toWalletId: string;
    amount: string;
    transactionDate: string;
    description?: string;
  },
) {
  if (data.fromWalletId === data.toWalletId) {
    throw new ValidationError('Cannot transfer to same wallet');
  }
  const amountNum = parsePositiveAmount(data.amount);
  if (Number.isNaN(amountNum)) {
    throw new ValidationError('Invalid amount');
  }

  return await db.transaction(async (tx) => {
    const [fromWallet, toWallet] = await Promise.all([
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
    ]);

    if (!fromWallet || !toWallet) {
      throw new ValidationError('Wallet not found');
    }
    if (parseFloat(String(fromWallet.balance)) < amountNum) {
      throw new ValidationError('Insufficient balance');
    }

    const [createdTransaction] = await tx
      .insert(transactions)
      .values({
        userId,
        type: 'transfer',
        isAllocationWithdraw: false,
        fromWalletId: data.fromWalletId,
        toWalletId: data.toWalletId,
        bucketId: null,
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

    return { ...createdTransaction!, transactionAttachments: [] };
  });
}

export async function updateTransaction(
  transactionId: string,
  userId: string,
  data: {
    walletId?: string;
    categoryId?: string;
    type?: TransactionType;
    amount?: string;
    description?: string;
    transactionDate?: string;
  },
) {
  const existing = await findTransactionOrFail(transactionId, userId);

  if (existing.type === 'transfer') {
    throw new ValidationError(
      'Transfer transactions cannot be updated from this endpoint',
    );
  }

  const updateData: Record<string, unknown> = {};

  if (data.walletId !== undefined) {
    const wallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.id, data.walletId),
        eq(wallets.userId, userId),
        isNull(wallets.deletedAt),
      ),
    });
    if (!wallet) {
      throw new ValidationError('Invalid wallet');
    }
    updateData.walletId = data.walletId;
    updateData.walletName = wallet.name;
  }

  if (data.categoryId !== undefined || data.type !== undefined) {
    const nextType = (data.type ?? existing.type) as TransactionType;
    const nextCategoryId = data.categoryId ?? existing.categoryId;
    if (!nextCategoryId) {
      throw new ValidationError('Category is required');
    }
    const resolvedCategory = await validateTransactionCategory(
      userId,
      nextCategoryId,
      nextType,
    );
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.type !== undefined) updateData.type = data.type;
    updateData.categoryName = resolvedCategory.name;
  }
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.transactionDate !== undefined)
    updateData.transactionDate = data.transactionDate;

  const [updatedTransaction] = await db
    .update(transactions)
    .set(updateData)
    .where(eq(transactions.id, transactionId))
    .returning();

  // Recalculate balance for affected wallets
  if (existing.walletId) {
    await recalculateWalletBalance(existing.walletId);
  }
  if (data.walletId && data.walletId !== existing.walletId) {
    await recalculateWalletBalance(data.walletId);
  }

  const attachments = await db.query.transactionAttachments.findMany({
    where: eq(transactionAttachments.transactionId, transactionId),
  });

  return { ...updatedTransaction!, transactionAttachments: attachments };
}

export async function deleteTransaction(transactionId: string, userId: string) {
  const existing = await findTransactionOrFail(transactionId, userId);

  // Delete associated files from disk
  if (existing.transactionAttachments) {
    for (const fileAttachment of existing.transactionAttachments) {
      await deleteFile(fileAttachment.filePath);
    }
  }

  await db.delete(transactions).where(eq(transactions.id, transactionId));
  if (existing.type === 'transfer') {
    if (existing.fromWalletId) {
      await recalculateWalletBalance(existing.fromWalletId);
    }
    if (existing.toWalletId) {
      await recalculateWalletBalance(existing.toWalletId);
    }
  } else if (existing.walletId) {
    await recalculateWalletBalance(existing.walletId);
  }
}

export async function addAttachment(
  transactionId: string,
  userId: string,
  file: File,
) {
  await findTransactionOrFail(transactionId, userId);

  const uploadResult: UploadResult = await saveFile(file);

  const [newAttachment] = await db
    .insert(transactionAttachments)
    .values({
      transactionId,
      filePath: uploadResult.filePath,
      fileName: uploadResult.fileName,
      mimeType: uploadResult.mimeType,
      fileSize: uploadResult.fileSize,
    })
    .returning();

  return newAttachment!;
}

export async function deleteAttachment(
  transactionId: string,
  attachmentId: string,
  userId: string,
) {
  await findTransactionOrFail(transactionId, userId);

  const attachment = await db.query.transactionAttachments.findFirst({
    where: and(
      eq(transactionAttachments.id, attachmentId),
      eq(transactionAttachments.transactionId, transactionId),
    ),
  });

  if (!attachment) throw new NotFoundError('Attachment');

  await deleteFile(attachment.filePath);
  await db
    .delete(transactionAttachments)
    .where(eq(transactionAttachments.id, attachmentId));
}
