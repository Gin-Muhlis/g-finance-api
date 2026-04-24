import { eq, and, inArray, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { budgets } from '../../db/schema/budgets.ts';
import { budgetItems } from '../../db/schema/budget-items.ts';
import { categories } from '../../db/schema/categories.ts';
import { transactions } from '../../db/schema/transactions.ts';
import { ValidationError } from '../../common/errors.ts';

function getMonthDateRange(
  year: number,
  month: number,
): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endOfMonth = new Date(year, month, 0);
  const monthString = String(endOfMonth.getMonth() + 1).padStart(2, '0');
  const dayString = String(endOfMonth.getDate()).padStart(2, '0');
  const endDate = `${endOfMonth.getFullYear()}-${monthString}-${dayString}`;
  return { startDate, endDate };
}

function toMoneyString(raw: string | number | null | undefined): string {
  const parsed = parseFloat(String(raw ?? '0'));
  if (Number.isNaN(parsed)) return '0.00';
  return parsed.toFixed(2);
}

function calcProgress(allocated: string, actual: string): number | null {
  const allocatedAmount = parseFloat(allocated);
  if (allocatedAmount <= 0) return null;
  const actualAmount = parseFloat(actual);
  if (Number.isNaN(actualAmount)) return null;
  return Math.round((actualAmount / allocatedAmount) * 10000) / 100;
}

type BudgetItemInput = { categoryId: string; allocatedAmount: string };

export async function getBudgetSummary(userId: string, year: number, month: number) {
  if (month < 1 || month > 12) {
    throw new ValidationError('Month must be between 1 and 12');
  }
  if (year < 1970 || year > 2100) {
    throw new ValidationError('Year is out of range');
  }

  const { startDate, endDate } = getMonthDateRange(year, month);

  const [expenseCategories, actualRows, budget] = await Promise.all([
    db.query.categories.findMany({
      where: and(
        eq(categories.userId, userId),
        eq(categories.type, 'expense'),
      ),
      orderBy: (category, { asc }) => [asc(category.name)],
    }),
    db
      .select({
        categoryId: transactions.categoryId,
        total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)::text`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'expense'),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate),
        ),
      )
      .groupBy(transactions.categoryId),
    db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, userId),
        eq(budgets.year, year),
        eq(budgets.month, month),
      ),
    }),
  ]);

  const actualByCategory = new Map(
    actualRows.map((row) => [row.categoryId, toMoneyString(row.total)]),
  );

  let itemAllocations = new Map<string, string>();
  if (budget) {
    const rows = await db.query.budgetItems.findMany({
      where: eq(budgetItems.budgetId, budget.id),
    });
    for (const row of rows) {
      itemAllocations.set(
        row.categoryId,
        toMoneyString(String(row.allocatedAmount)),
      );
    }
  }

  let totalAllocated = 0;
  let totalActual = 0;

  const items = expenseCategories.map((expenseCategory) => {
    const actualAmount = toMoneyString(
      actualByCategory.get(expenseCategory.id) ?? '0',
    );
    const allocated = itemAllocations.get(expenseCategory.id);
    const hasBudget = allocated !== undefined;
    const allocatedStr = hasBudget ? allocated! : null;
    const actualNum = parseFloat(actualAmount);
    const allocNum = allocatedStr !== null ? parseFloat(allocatedStr) : 0;
    if (hasBudget) totalAllocated += allocNum;
    totalActual += actualNum;

    let remaining: string | null = null;
    let progressPercent: number | null = null;
    let isOverBudget = false;

    if (hasBudget && allocatedStr !== null) {
      remaining = toMoneyString(allocNum - actualNum);
      progressPercent = calcProgress(allocatedStr, actualAmount);
      isOverBudget = actualNum > allocNum + 1e-9;
    }

    return {
      category: {
        id: expenseCategory.id,
        name: expenseCategory.name,
        type: expenseCategory.type,
        icon: expenseCategory.icon,
        color: expenseCategory.color,
        createdAt: expenseCategory.createdAt.toISOString(),
      },
      hasBudget,
      allocatedAmount: allocatedStr,
      actualAmount,
      remaining,
      progressPercent,
      isOverBudget,
    };
  });

  return {
    period: { year, month, startDate, endDate },
    budget: budget
      ? {
          id: budget.id,
          totalBudget: budget.totalBudget
            ? toMoneyString(String(budget.totalBudget))
            : null,
          createdAt: budget.createdAt.toISOString(),
        }
      : null,
    items,
    totals: {
      totalAllocated: toMoneyString(String(totalAllocated)),
      totalActual: toMoneyString(String(totalActual)),
    },
  };
}

export async function upsertBudget(
  userId: string,
  data: {
    year: number;
    month: number;
    totalBudget?: string | null;
    items: BudgetItemInput[];
  },
) {
  if (data.month < 1 || data.month > 12) {
    throw new ValidationError('Month must be between 1 and 12');
  }
  if (data.year < 1970 || data.year > 2100) {
    throw new ValidationError('Year is out of range');
  }

  const seen = new Set<string>();
  for (const line of data.items) {
    if (seen.has(line.categoryId)) {
      throw new ValidationError('Duplicate category in budget items');
    }
    seen.add(line.categoryId);
  }

  if (data.items.length > 0) {
    const matchingCategories = await db.query.categories.findMany({
      where: and(
        eq(categories.userId, userId),
        inArray(
          categories.id,
          data.items.map((line) => line.categoryId),
        ),
      ),
    });
    if (matchingCategories.length !== data.items.length) {
      throw new ValidationError('One or more categories are invalid');
    }
    for (const category of matchingCategories) {
      if (category.type !== 'expense') {
        throw new ValidationError('Budget can only use expense categories');
      }
    }
  }

  await db.transaction(async (dbTransaction) => {
    const existing = await dbTransaction.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, userId),
        eq(budgets.year, data.year),
        eq(budgets.month, data.month),
      ),
    });

    const totalBudgetValue =
      data.totalBudget != null && data.totalBudget !== ''
        ? data.totalBudget
        : null;

    let budgetId: string;
    if (existing) {
      await dbTransaction
        .update(budgets)
        .set({
          totalBudget: totalBudgetValue,
        })
        .where(eq(budgets.id, existing.id));
      await dbTransaction
        .delete(budgetItems)
        .where(eq(budgetItems.budgetId, existing.id));
      budgetId = existing.id;
    } else {
      const [insertedBudget] = await dbTransaction
        .insert(budgets)
        .values({
          userId,
          year: data.year,
          month: data.month,
          totalBudget: totalBudgetValue,
        })
        .returning({ id: budgets.id });
      budgetId = insertedBudget!.id;
    }

    if (data.items.length > 0) {
      await dbTransaction.insert(budgetItems).values(
        data.items.map((line) => ({
          budgetId,
          categoryId: line.categoryId,
          allocatedAmount: line.allocatedAmount,
        })),
      );
    }
  });

  return getBudgetSummary(userId, data.year, data.month);
}

export async function deleteBudget(userId: string, budgetId: string) {
  const foundBudget = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, budgetId), eq(budgets.userId, userId)),
  });
  if (!foundBudget) {
    return false;
  }
  await db.delete(budgets).where(eq(budgets.id, budgetId));
  return true;
}
