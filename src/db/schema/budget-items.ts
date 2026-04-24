import { pgTable, uuid, timestamp, uniqueIndex, decimal } from 'drizzle-orm/pg-core';
import { budgets } from './budgets.ts';
import { categories } from './categories.ts';

export const budgetItems = pgTable(
  'budget_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    allocatedAmount: decimal('allocated_amount', {
      precision: 15,
      scale: 2,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('budget_items_budget_category_idx').on(
      table.budgetId,
      table.categoryId,
    ),
  ],
);
