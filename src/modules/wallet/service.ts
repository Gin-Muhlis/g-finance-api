import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { wallets } from '../../db/schema/wallets.ts';
import { transactions } from '../../db/schema/transactions.ts';
import { NotFoundError, ForbiddenError } from '../../common/errors.ts';

type WalletType = 'bank' | 'e-wallet' | 'cash' | 'savings' | 'investment';

async function findWalletOrFail(walletId: string, userId: string) {
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), isNull(wallets.deletedAt)),
  });

  if (!wallet) throw new NotFoundError('Wallet');
  if (wallet.userId !== userId) throw new ForbiddenError();

  return wallet;
}

export async function listWallets(userId: string, type?: WalletType) {
  const conditions = [eq(wallets.userId, userId), isNull(wallets.deletedAt)];
  if (type) conditions.push(eq(wallets.type, type));

  const where = and(...conditions);

  return db.query.wallets.findMany({
    where,
    orderBy: (w, { desc }) => [desc(w.createdAt)],
  });
}

export async function getWallet(walletId: string, userId: string) {
  return findWalletOrFail(walletId, userId);
}

function balanceToDecimalString(value: number): string {
  return Number.isFinite(value) ? value.toString() : '0';
}

export async function createWallet(
  userId: string,
  data: {
    name: string;
    type: WalletType;
    balance?: number;
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
      balance: balanceToDecimalString(data.balance ?? 0),
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
    balance?: number;
    currency?: string;
    icon?: string;
    isActive?: boolean;
  },
) {
  await findWalletOrFail(walletId, userId);

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.balance !== undefined)
    updateData.balance = balanceToDecimalString(data.balance);
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updatedWallet] = await db
    .update(wallets)
    .set(updateData)
    .where(and(eq(wallets.id, walletId), isNull(wallets.deletedAt)))
    .returning();

  return updatedWallet!;
}

export async function deleteWallet(walletId: string, userId: string) {
  const wallet = await findWalletOrFail(walletId, userId);

  await db
    .update(transactions)
    .set({ walletName: wallet.name })
    .where(
      and(eq(transactions.walletId, walletId), eq(transactions.userId, userId)),
    );

  const [softDeleted] = await db
    .update(wallets)
    .set({
      deletedAt: new Date(),
      isActive: false,
    })
    .where(eq(wallets.id, walletId))
    .returning();

  return softDeleted!;
}
