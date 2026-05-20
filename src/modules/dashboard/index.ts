import Elysia from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import {
  recentTransactionListResponse,
  recentTransactionQuery,
} from '../transaction/model.ts';
import * as transactionService from '../transaction/service.ts';

function formatCategoryEmbedded(categoryRecord: {
  id: string;
  userId: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  createdAt: Date;
}) {
  return {
    id: categoryRecord.id,
    userId: categoryRecord.userId,
    name: categoryRecord.name,
    type: categoryRecord.type,
    icon: categoryRecord.icon,
    color: categoryRecord.color,
    createdAt: categoryRecord.createdAt.toISOString(),
  };
}

function formatWalletEmbedded(walletRecord: {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
  icon: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: walletRecord.id,
    userId: walletRecord.userId,
    name: walletRecord.name,
    type: walletRecord.type,
    balance: walletRecord.balance,
    currency: walletRecord.currency,
    icon: walletRecord.icon,
    isActive: walletRecord.isActive,
    createdAt: walletRecord.createdAt.toISOString(),
    updatedAt: walletRecord.updatedAt.toISOString(),
  };
}

function formatRecentTransaction(listItem: Awaited<
  ReturnType<typeof transactionService.listRecentTransactions>
>[number]) {
  return {
    id: listItem.id,
    userId: listItem.userId,
    walletId: listItem.walletId,
    categoryId: listItem.categoryId,
    fromWalletId: listItem.fromWalletId ?? null,
    toWalletId: listItem.toWalletId ?? null,
    bucketId: listItem.bucketId ?? null,
    isAllocationWithdraw: listItem.isAllocationWithdraw,
    type: listItem.type,
    amount: listItem.amount,
    description: listItem.description,
    transactionDate: listItem.transactionDate,
    createdAt: listItem.createdAt.toISOString(),
    updatedAt: listItem.updatedAt.toISOString(),
    categoryName: listItem.category?.name ?? null,
    walletName: listItem.wallet?.name ?? null,
    category: listItem.category
      ? formatCategoryEmbedded(listItem.category)
      : null,
    wallet: listItem.wallet ? formatWalletEmbedded(listItem.wallet) : null,
    fromWallet: listItem.fromWallet
      ? formatWalletEmbedded(listItem.fromWallet)
      : null,
    toWallet: listItem.toWallet ? formatWalletEmbedded(listItem.toWallet) : null,
  };
}

export const dashboardModule = new Elysia({ prefix: '/dashboard' })
  .use(authGuard)
  .get(
    '/recent-transactions',
    async ({ userId, query }) => {
      const parsedLimit = parseInt(query.limit ?? '5', 10);
      const rows = await transactionService.listRecentTransactions(userId, {
        type: query.type as 'income' | 'expense' | 'transfer' | undefined,
        walletId: query.walletId,
        categoryId: query.categoryId,
        search: query.search,
        limit: Number.isNaN(parsedLimit) ? 5 : parsedLimit,
      });
      return rows.map(formatRecentTransaction);
    },
    {
      query: recentTransactionQuery,
      response: recentTransactionListResponse,
      detail: {
        tags: ['Dashboard'],
        summary:
          'Dashboard-only latest transactions (income, expense, transfer)',
      },
    },
  );
