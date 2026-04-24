import { eq, and, sql, asc, isNull } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { categories } from '../../db/schema/categories.ts';
import { transactions } from '../../db/schema/transactions.ts';
import { NotFoundError, ForbiddenError } from '../../common/errors.ts';

type CategoryType = 'income' | 'expense' | 'allocation';

async function findCategoryOrFail(categoryId: string, userId: string) {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), isNull(categories.deletedAt)),
  });

  if (!category) throw new NotFoundError('Category');
  if (category.userId !== userId) throw new ForbiddenError();

  return category;
}

interface ListCategoriesOptions {
  type?: CategoryType;
  page: number;
  limit: number;
}

export async function listCategories(
  userId: string,
  opts: ListCategoriesOptions,
) {
  const conditions = [
    eq(categories.userId, userId),
    isNull(categories.deletedAt),
  ];
  if (opts.type) {
    conditions.push(eq(categories.type, opts.type));
  }

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.limit;

  const [categoryRows, countResult] = await Promise.all([
    db.query.categories.findMany({
      where,
      orderBy: [asc(categories.name)],
      limit: opts.limit,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(where),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data: categoryRows,
    meta: {
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.ceil(total / opts.limit),
    },
  };
}

export async function getCategory(categoryId: string, userId: string) {
  return findCategoryOrFail(categoryId, userId);
}

export async function createCategory(
  userId: string,
  data: {
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
  },
) {
  const [newCategory] = await db
    .insert(categories)
    .values({
      userId,
      name: data.name,
      type: data.type,
      icon: data.icon ?? null,
      color: data.color ?? null,
    })
    .returning();

  return newCategory!;
}

export async function updateCategory(
  categoryId: string,
  userId: string,
  data: {
    name?: string;
    icon?: string;
    color?: string;
  },
) {
  await findCategoryOrFail(categoryId, userId);

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;

  const [updatedCategory] = await db
    .update(categories)
    .set(updateData)
    .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
    .returning();

  return updatedCategory!;
}

export async function deleteCategory(categoryId: string, userId: string) {
  const category = await findCategoryOrFail(categoryId, userId);

  await db
    .update(transactions)
    .set({ categoryName: category.name })
    .where(
      and(
        eq(transactions.categoryId, categoryId),
        eq(transactions.userId, userId),
      ),
    );

  await db
    .update(categories)
    .set({ deletedAt: new Date() })
    .where(eq(categories.id, categoryId));
}
