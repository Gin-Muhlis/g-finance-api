import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users.ts';

export const buckets = pgTable('buckets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }),
  targetAmount: decimal('target_amount', { precision: 15, scale: 2 }),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
