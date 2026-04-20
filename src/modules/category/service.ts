import { eq, and, sql, asc } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { categories } from '../../db/schema/categories.ts';
import { NotFoundError, ForbiddenError } from '../../common/errors.ts';

type CategoryType = 'income' | 'expense' | 'allocation';

async function findCategoryOrFail(categoryId: string, userId: string) {
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
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
  const conditions = [eq(categories.userId, userId)];
  if (opts.type) {
    conditions.push(eq(categories.type, opts.type));
  }

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.limit;

  const [data, countResult] = await Promise.all([
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
  console.log(data);

  const total = countResult[0]?.count ?? 0;

  return {
    data,
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
  const [category] = await db
    .insert(categories)
    .values({
      userId,
      name: data.name,
      type: data.type,
      icon: data.icon ?? null,
      color: data.color ?? null,
    })
    .returning();

  return category!;
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

  const [updated] = await db
    .update(categories)
    .set(updateData)
    .where(eq(categories.id, categoryId))
    .returning();

  return updated!;
}

export async function deleteCategory(categoryId: string, userId: string) {
  await findCategoryOrFail(categoryId, userId);

  await db.delete(categories).where(eq(categories.id, categoryId));
}
