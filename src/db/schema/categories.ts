import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.ts';

export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense']);

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: categoryTypeEnum('type').notNull(),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
