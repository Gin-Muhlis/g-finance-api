import {
  pgTable,
  uuid,
  varchar,
  decimal,
  date,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users.ts';
import { wallets } from './wallets.ts';
import { categories } from './categories.ts';

export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
]);

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  walletId: uuid('wallet_id')
    .notNull()
    .references(() => wallets.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  walletName: varchar('wallet_name', { length: 255 }),
  categoryName: varchar('category_name', { length: 255 }),
  type: transactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }),
  transactionDate: date('transaction_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
