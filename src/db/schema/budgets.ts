import { pgTable, uuid, integer, timestamp, uniqueIndex, decimal } from 'drizzle-orm/pg-core';
import { users } from './users.ts';

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    month: integer('month').notNull(), // 1-12
    year: integer('year').notNull(),
    totalBudget: decimal('total_budget', { precision: 15, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('budgets_user_year_month_idx').on(
      table.userId,
      table.year,
      table.month,
    ),
  ],
);
