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

function formatAttachment(a: {
  id: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}) {
  return {
    id: a.id,
    filePath: a.filePath,
    fileName: a.fileName,
    mimeType: a.mimeType,
    fileSize: a.fileSize,
    createdAt: a.createdAt.toISOString(),
  };
}

function formatTransaction(tx: {
  id: string;
  walletId: string;
  categoryId: string;
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
    id: tx.id,
    walletId: tx.walletId,
    categoryId: tx.categoryId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    transactionDate: tx.transactionDate,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    attachments: tx.transactionAttachments?.map(formatAttachment),
  };
}

export const transactionModule = new Elysia({ prefix: '/transactions' })
  .use(authGuard)
  .get(
    '/',
    async ({ userId, query }) => {
      const page = Math.max(1, parseInt(query.page ?? '1'));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));

      const result = await transactionService.listTransactions(userId, {
        type: query.type as 'income' | 'expense' | undefined,
        walletId: query.walletId,
        categoryId: query.categoryId,
        startDate: query.startDate,
        endDate: query.endDate,
        page,
        limit,
      });

      return {
        data: result.data.map(formatTransaction),
        meta: result.meta,
      };
    },
    {
      query: transactionQuery,
      response: transactionListResponse,
      detail: {
        tags: ['Transactions'],
        summary: 'List transactions with filters and pagination',
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
