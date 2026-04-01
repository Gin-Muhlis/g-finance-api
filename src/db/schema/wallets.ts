import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users.ts';

export const walletTypeEnum = pgEnum('wallet_type', [
  'bank',
  'e-wallet',
  'cash',
  'savings',
  'investment',
]);

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: walletTypeEnum('type').notNull().default('cash'),
  balance: decimal('balance', { precision: 15, scale: 2 })
    .notNull()
    .default('0'),
  currency: varchar('currency', { length: 10 }).notNull().default('IDR'),
  icon: varchar('icon', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
