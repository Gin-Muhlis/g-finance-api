import { eq, and } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { wallets } from '../../db/schema/wallets.ts';
import { NotFoundError, ForbiddenError } from '../../common/errors.ts';

type WalletType = 'bank' | 'e-wallet' | 'cash' | 'savings' | 'investment';

async function findWalletOrFail(walletId: string, userId: string) {
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId)),
  });

  if (!wallet) throw new NotFoundError('Wallet');
  if (wallet.userId !== userId) throw new ForbiddenError();

  return wallet;
}

export async function listWallets(userId: string) {
  return db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
    orderBy: (wallet, { desc }) => [desc(wallet.createdAt)],
  });
}

export async function getWallet(walletId: string, userId: string) {
  return findWalletOrFail(walletId, userId);
}

export async function createWallet(
  userId: string,
  data: {
    name: string;
    type: WalletType;
    balance?: string;
    currency?: string;
    icon?: string;
  },
) {
  const [newWallet] = await db
    .insert(wallets)
    .values({
      userId,
      name: data.name,
      type: data.type,
      balance: data.balance ?? '0',
      currency: data.currency ?? 'IDR',
      icon: data.icon ?? null,
    })
    .returning();

  return newWallet!;
}

export async function updateWallet(
  walletId: string,
  userId: string,
  data: {
    name?: string;
    type?: WalletType;
    currency?: string;
    icon?: string;
    isActive?: boolean;
  },
) {
  await findWalletOrFail(walletId, userId);

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updatedWallet] = await db
    .update(wallets)
    .set(updateData)
    .where(eq(wallets.id, walletId))
    .returning();

  return updatedWallet!;
}

export async function deleteWallet(walletId: string, userId: string) {
  await findWalletOrFail(walletId, userId);

  const [deactivatedWallet] = await db
    .update(wallets)
    .set({ isActive: false })
    .where(eq(wallets.id, walletId))
    .returning();

  return deactivatedWallet!;
}
