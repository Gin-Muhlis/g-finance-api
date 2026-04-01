import Elysia, { t } from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import {
  createWalletBody,
  updateWalletBody,
  walletResponse,
  walletListResponse,
} from './model.ts';
import * as walletService from './service.ts';

function formatWallet(w: {
  id: string;
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
    id: w.id,
    name: w.name,
    type: w.type,
    balance: w.balance,
    currency: w.currency,
    icon: w.icon,
    isActive: w.isActive,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export const walletModule = new Elysia({ prefix: '/wallets' })
  .use(authGuard)
  .get(
    '/',
    async ({ userId }) => {
      const wallets = await walletService.listWallets(userId);
      return wallets.map(formatWallet);
    },
    {
      response: walletListResponse,
      detail: { tags: ['Wallets'], summary: 'List all wallets' },
    },
  )
  .post(
    '/',
    async ({ userId, body }) => {
      const wallet = await walletService.createWallet(userId, body);
      return formatWallet(wallet);
    },
    {
      body: createWalletBody,
      response: walletResponse,
      detail: { tags: ['Wallets'], summary: 'Create a new wallet' },
    },
  )
  .get(
    '/:id',
    async ({ userId, params }) => {
      const wallet = await walletService.getWallet(params.id, userId);
      return formatWallet(wallet);
    },
    {
      params: t.Object({ id: t.String() }),
      response: walletResponse,
      detail: { tags: ['Wallets'], summary: 'Get wallet details' },
    },
  )
  .put(
    '/:id',
    async ({ userId, params, body }) => {
      const wallet = await walletService.updateWallet(params.id, userId, body);
      return formatWallet(wallet);
    },
    {
      params: t.Object({ id: t.String() }),
      body: updateWalletBody,
      response: walletResponse,
      detail: { tags: ['Wallets'], summary: 'Update wallet' },
    },
  )
  .delete(
    '/:id',
    async ({ userId, params }) => {
      const wallet = await walletService.deleteWallet(params.id, userId);
      return formatWallet(wallet);
    },
    {
      params: t.Object({ id: t.String() }),
      response: walletResponse,
      detail: { tags: ['Wallets'], summary: 'Deactivate wallet' },
    },
  );
