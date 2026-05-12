import { relations } from 'drizzle-orm';
import { users } from './users.ts';
import { refreshTokens } from './refresh-tokens.ts';
import { wallets } from './wallets.ts';
import { categories } from './categories.ts';
import { transactions } from './transactions.ts';
import { transactionAttachments } from './transaction-attachments.ts';
import { budgets } from './budgets.ts';
import { budgetItems } from './budget-items.ts';
import { buckets } from './buckets.ts';

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  wallets: many(wallets),
  categories: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
  buckets: many(buckets),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(transactions, {
    relationName: 'wallet_transaction',
  }),
  transfersFrom: many(transactions, {
    relationName: 'transfer_from_wallet',
  }),
  transfersTo: many(transactions, {
    relationName: 'transfer_to_wallet',
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgetItems: many(budgetItems),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  items: many(budgetItems),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetItems.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [budgetItems.categoryId],
    references: [categories.id],
  }),
}));

export const bucketsRelations = relations(buckets, ({ one, many }) => ({
  user: one(users, {
    fields: [buckets.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [transactions.userId],
      references: [users.id],
    }),
    wallet: one(wallets, {
      fields: [transactions.walletId],
      references: [wallets.id],
      relationName: 'wallet_transaction',
    }),
    fromWallet: one(wallets, {
      fields: [transactions.fromWalletId],
      references: [wallets.id],
      relationName: 'transfer_from_wallet',
    }),
    toWallet: one(wallets, {
      fields: [transactions.toWalletId],
      references: [wallets.id],
      relationName: 'transfer_to_wallet',
    }),
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
    }),
    bucket: one(buckets, {
      fields: [transactions.bucketId],
      references: [buckets.id],
    }),
    transactionAttachments: many(transactionAttachments),
  }),
);

export const transactionAttachmentsRelations = relations(
  transactionAttachments,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionAttachments.transactionId],
      references: [transactions.id],
    }),
  }),
);
