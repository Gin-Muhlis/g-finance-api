import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
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

type TransactionType = 'income' | 'expense';

async function validateTransactionCategory(
  userId: string,
  categoryId: string,
  transactionType: TransactionType,
) {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
  });
  if (!category) throw new ValidationError('Invalid category');
  if (category.type === 'allocation') {
    throw new ValidationError(
      'Allocation categories cannot be used for transactions',
    );
  }
  if (category.type !== transactionType) {
    throw new ValidationError('Category type must match transaction type');
  }
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

async function updateWalletBalance(walletId: string) {
  const incomeResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), '0')` })
    .from(transactions)
    .where(
      and(eq(transactions.walletId, walletId), eq(transactions.type, 'income')),
    );

  const expenseResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), '0')` })
    .from(transactions)
    .where(
      and(
        eq(transactions.walletId, walletId),
        eq(transactions.type, 'expense'),
      ),
    );

  const income = parseFloat(incomeResult[0]?.total ?? '0');
  const expense = parseFloat(expenseResult[0]?.total ?? '0');
  const balance = (income - expense).toFixed(2);

  await db.update(wallets).set({ balance }).where(eq(wallets.id, walletId));
}

interface ListOptions {
  type?: TransactionType;
  walletId?: string;
  categoryId?: string;
  startDate: string;
  endDate: string;
}

function listTransactionsWhere(
  userId: string,
  opts: ListOptions,
) {
  const conditions = [
    eq(transactions.userId, userId),
    gte(transactions.transactionDate, opts.startDate),
    lte(transactions.transactionDate, opts.endDate),
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
      with: { wallet: true, category: true },
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
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, data.walletId),
  });
  if (!wallet || wallet.userId !== userId) {
    throw new ValidationError('Invalid wallet');
  }

  await validateTransactionCategory(userId, data.categoryId, data.type);

  const [createdTransaction] = await db
    .insert(transactions)
    .values({
      userId,
      walletId: data.walletId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description ?? null,
      transactionDate: data.transactionDate,
    })
    .returning();

  await updateWalletBalance(data.walletId);

  return { ...createdTransaction!, transactionAttachments: [] };
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

  if (data.walletId) {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.id, data.walletId),
    });
    if (!wallet || wallet.userId !== userId) {
      throw new ValidationError('Invalid wallet');
    }
  }

  if (data.categoryId !== undefined || data.type !== undefined) {
    const nextType = (data.type ?? existing.type) as TransactionType;
    const nextCategoryId = data.categoryId ?? existing.categoryId;
    await validateTransactionCategory(userId, nextCategoryId, nextType);
  }

  const updateData: Record<string, unknown> = {};
  if (data.walletId !== undefined) updateData.walletId = data.walletId;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.type !== undefined) updateData.type = data.type;
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
  await updateWalletBalance(existing.walletId);
  if (data.walletId && data.walletId !== existing.walletId) {
    await updateWalletBalance(data.walletId);
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
  await updateWalletBalance(existing.walletId);
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
