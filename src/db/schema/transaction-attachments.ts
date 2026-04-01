import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { transactions } from './transactions.ts';

export const transactionAttachments = pgTable('transaction_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  filePath: varchar('file_path', { length: 1024 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
