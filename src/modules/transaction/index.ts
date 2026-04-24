import Elysia, { t } from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import {
  createTransactionBody,
  updateTransactionBody,
  transactionQuery,
  transactionResponse,
  transactionListResponse,
} from './model.ts';
import { messageResponse } from '../auth/model.ts';
import * as transactionService from './service.ts';

function formatAttachment(attachmentRow: {
  id: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}) {
  return {
    id: attachmentRow.id,
    filePath: attachmentRow.filePath,
    fileName: attachmentRow.fileName,
    mimeType: attachmentRow.mimeType,
    fileSize: attachmentRow.fileSize,
    createdAt: attachmentRow.createdAt.toISOString(),
  };
}

function formatTransaction(transactionRecord: {
  id: string;
  walletId: string;
  categoryId: string;
  walletName: string | null;
  categoryName: string | null;
  type: string;
  amount: string;
  description: string | null;
  transactionDate: string;
  createdAt: Date;
  updatedAt: Date;
  transactionAttachments?: Array<{
    id: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    createdAt: Date;
  }>;
}) {
  return {
    id: transactionRecord.id,
    walletId: transactionRecord.walletId,
    categoryId: transactionRecord.categoryId,
    type: transactionRecord.type,
    amount: transactionRecord.amount,
    description: transactionRecord.description,
    transactionDate: transactionRecord.transactionDate,
    createdAt: transactionRecord.createdAt.toISOString(),
    updatedAt: transactionRecord.updatedAt.toISOString(),
    attachments: transactionRecord.transactionAttachments?.map(formatAttachment),
  };
}

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

function formatListTransactionItem(listItem: {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string;
  walletName: string | null;
  categoryName: string | null;
  type: string;
  amount: string;
  description: string | null;
  transactionDate: string;
  createdAt: Date;
  updatedAt: Date;
  wallet: {
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
  } | null;
  category: {
    id: string;
    userId: string;
    name: string;
    type: string;
    icon: string | null;
    color: string | null;
    createdAt: Date;
  } | null;
}) {
  return {
    id: listItem.id,
    userId: listItem.userId,
    walletId: listItem.walletId,
    categoryId: listItem.categoryId,
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
  };
}

export const transactionModule = new Elysia({ prefix: '/transactions' })
  .use(authGuard)
  .get(
    '/',
    async ({ userId, query }) => {
      const result = await transactionService.listTransactions(userId, {
        type: query.type as 'income' | 'expense' | undefined,
        walletId: query.walletId,
        categoryId: query.categoryId,
        startDate: query.startDate,
        endDate: query.endDate,
      });

      return {
        transactionsByDay: result.transactionsByDay.map((dayGroup) => ({
          transactionDate: dayGroup.transactionDate,
          transactions: dayGroup.transactions.map(formatListTransactionItem),
        })),
        totalIncome: result.totalIncome,
        totalExpense: result.totalExpense,
      };
    },
    {
      query: transactionQuery,
      response: transactionListResponse,
      detail: {
        tags: ['Transactions'],
        summary:
          'List transactions grouped by day; requires startDate and endDate; includes totals',
      },
    },
  )
  .post(
    '/',
    async ({ userId, body }) => {
      const transaction = await transactionService.createTransaction(
        userId,
        body,
      );
      return formatTransaction(transaction);
    },
    {
      body: createTransactionBody,
      response: transactionResponse,
      detail: { tags: ['Transactions'], summary: 'Create a new transaction' },
    },
  )
  .get(
    '/:id',
    async ({ userId, params }) => {
      const transaction = await transactionService.getTransaction(
        params.id,
        userId,
      );
      return formatTransaction(transaction);
    },
    {
      params: t.Object({ id: t.String() }),
      response: transactionResponse,
      detail: { tags: ['Transactions'], summary: 'Get transaction details' },
    },
  )
  .put(
    '/:id',
    async ({ userId, params, body }) => {
      const transaction = await transactionService.updateTransaction(
        params.id,
        userId,
        body,
      );
      return formatTransaction(transaction);
    },
    {
      params: t.Object({ id: t.String() }),
      body: updateTransactionBody,
      response: transactionResponse,
      detail: { tags: ['Transactions'], summary: 'Update transaction' },
    },
  )
  .delete(
    '/:id',
    async ({ userId, params }) => {
      await transactionService.deleteTransaction(params.id, userId);
      return { message: 'Transaction deleted successfully' };
    },
    {
      params: t.Object({ id: t.String() }),
      response: messageResponse,
      detail: { tags: ['Transactions'], summary: 'Delete transaction' },
    },
  )
  .post(
    '/:id/attachments',
    async ({ userId, params, body }) => {
      const attachment = await transactionService.addAttachment(
        params.id,
        userId,
        body.file,
      );
      return formatAttachment(attachment);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ file: t.File() }),
      detail: {
        tags: ['Transactions'],
        summary: 'Upload attachment to transaction',
      },
    },
  )
  .delete(
    '/:id/attachments/:attachmentId',
    async ({ userId, params }) => {
      await transactionService.deleteAttachment(
        params.id,
        params.attachmentId,
        userId,
      );
      return { message: 'Attachment deleted successfully' };
    },
    {
      params: t.Object({ id: t.String(), attachmentId: t.String() }),
      response: messageResponse,
      detail: {
        tags: ['Transactions'],
        summary: 'Delete attachment from transaction',
      },
    },
  );
