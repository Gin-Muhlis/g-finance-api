import {
  pgTable,
  uuid,
  varchar,
  decimal,
  date,
  timestamp,
  pgEnum,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { users } from './users.ts';
import { wallets } from './wallets.ts';
import { categories } from './categories.ts';
import { buckets } from './buckets.ts';

export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
  'transfer',
]);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id').references(() => wallets.id, {
      onDelete: 'cascade',
    }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'restrict',
    }),
    fromWalletId: uuid('from_wallet_id').references(() => wallets.id, {
      onDelete: 'set null',
    }),
    toWalletId: uuid('to_wallet_id').references(() => wallets.id, {
      onDelete: 'set null',
    }),
    bucketId: uuid('bucket_id').references(() => buckets.id, {
      onDelete: 'set null',
    }),
    walletName: varchar('wallet_name', { length: 255 }),
    categoryName: varchar('category_name', { length: 255 }),
    type: transactionTypeEnum('type').notNull(),
    isAllocationWithdraw: boolean('is_allocation_withdraw')
      .notNull()
      .default(false),
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
  },
  (table) => [
    index('idx_transactions_user_bucket').on(table.userId, table.bucketId),
    index('idx_transactions_wallet_transfer').on(
      table.fromWalletId,
      table.toWalletId,
    ),
  ],
);
