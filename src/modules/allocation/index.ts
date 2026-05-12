import Elysia from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import {
  allocationListQuery,
  allocationSummaryResponse,
  createAllocationBody,
  transferTransactionListResponse,
  transferTransactionResponse,
  withdrawAllocationBody,
} from './model.ts';
import * as allocationService from './service.ts';

function formatWalletLite(w: {
  id: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
} | null) {
  if (!w) return null;
  return {
    id: w.id,
    name: w.name,
    type: w.type,
    balance: w.balance,
    currency: w.currency,
  };
}

function formatBucketLite(b: { id: string; name: string } | null) {
  if (!b) return null;
  return { id: b.id, name: b.name };
}

function formatTransferRow(
  row: Awaited<
    ReturnType<typeof allocationService.listAllocations>
  >[number],
) {
  return {
    id: row.id,
    userId: row.userId,
    type: 'transfer' as const,
    isAllocationWithdraw: row.isAllocationWithdraw,
    fromWalletId: row.fromWalletId,
    toWalletId: row.toWalletId,
    bucketId: row.bucketId,
    amount: row.amount,
    description: row.description,
    transactionDate: row.transactionDate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fromWallet: formatWalletLite(row.fromWallet ?? null),
    toWallet: formatWalletLite(row.toWallet ?? null),
    bucket: formatBucketLite(row.bucket ?? null),
  };
}

type InsertedTransfer = Awaited<
  ReturnType<typeof allocationService.createAllocation>
>;

function formatCreatedTransferRow(row: InsertedTransfer) {
  return {
    id: row.id,
    userId: row.userId,
    type: 'transfer' as const,
    isAllocationWithdraw: row.isAllocationWithdraw,
    fromWalletId: row.fromWalletId,
    toWalletId: row.toWalletId,
    bucketId: row.bucketId,
    amount: row.amount,
    description: row.description,
    transactionDate: row.transactionDate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fromWallet: null,
    toWallet: null,
    bucket: null,
  };
}

export const allocationModule = new Elysia({ prefix: '/allocations' })
  .use(authGuard)
  .get(
    '/summary',
    async ({ userId }) => {
      return allocationService.getAllocationSummary(userId);
    },
    {
      response: allocationSummaryResponse,
      detail: {
        tags: ['Allocations'],
        summary: 'Wallet total balance vs bucket-allocated amount (available)',
      },
    },
  )
  .get(
    '/',
    async ({ userId, query }) => {
      const rows = await allocationService.listAllocations(userId, {
        bucketId: query.bucketId,
      });
      return rows.map(formatTransferRow);
    },
    {
      query: allocationListQuery,
      response: transferTransactionListResponse,
      detail: {
        tags: ['Allocations'],
        summary: 'Transfer (allocation) history, optional bucket filter',
      },
    },
  )
  .post(
    '/withdraw',
    async ({ userId, body }) => {
      const row = await allocationService.withdrawFromBucket(userId, {
        fromWalletId: body.fromWalletId,
        toWalletId: body.toWalletId,
        bucketId: body.bucketId,
        amount: body.amount,
        transactionDate: body.transactionDate,
        description: body.description,
      });
      return formatCreatedTransferRow(row);
    },
    {
      body: withdrawAllocationBody,
      response: transferTransactionResponse,
      detail: {
        tags: ['Allocations'],
        summary: 'Withdraw from bucket (validates bucket net balance)',
      },
    },
  )
  .post(
    '/',
    async ({ userId, body }) => {
      const row = await allocationService.createAllocation(userId, {
        fromWalletId: body.fromWalletId,
        toWalletId: body.toWalletId,
        bucketId: body.bucketId,
        amount: body.amount,
        transactionDate: body.transactionDate,
        description: body.description,
      });
      return formatCreatedTransferRow(row);
    },
    {
      body: createAllocationBody,
      response: transferTransactionResponse,
      detail: {
        tags: ['Allocations'],
        summary: 'Allocate funds (wallet-to-wallet transfer tagged with bucket)',
      },
    },
  );
