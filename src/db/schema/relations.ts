import { relations } from 'drizzle-orm';
import { users } from './users.ts';
import { refreshTokens } from './refresh-tokens.ts';
import { wallets } from './wallets.ts';
import { categories } from './categories.ts';
import { transactions } from './transactions.ts';
import { transactionAttachments } from './transaction-attachments.ts';
import { budgets } from './budgets.ts';
import { budgetItems } from './budget-items.ts';

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  wallets: many(wallets),
  categories: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
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
  transactions: many(transactions),
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
    }),
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
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
