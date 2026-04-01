import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './schema/users.ts';
import { categories } from './schema/categories.ts';
import { hashPassword } from '../utils/hash.ts';

const DATABASE_URL = process.env.DATABASE_URL!;
const client = postgres(DATABASE_URL);
const db = drizzle(client);

const DEFAULT_CATEGORIES = [
  { name: 'Gaji', type: 'income' as const, icon: '💰', color: '#4CAF50' },
  { name: 'Freelance', type: 'income' as const, icon: '💻', color: '#2196F3' },
  { name: 'Investasi', type: 'income' as const, icon: '📈', color: '#9C27B0' },
  { name: 'Hadiah', type: 'income' as const, icon: '🎁', color: '#FF9800' },
  {
    name: 'Penjualan',
    type: 'income' as const,
    icon: '🏷️',
    color: '#00BCD4',
  },
  {
    name: 'Lainnya',
    type: 'income' as const,
    icon: '📥',
    color: '#607D8B',
  },

  { name: 'Makanan', type: 'expense' as const, icon: '🍔', color: '#F44336' },
  {
    name: 'Transportasi',
    type: 'expense' as const,
    icon: '🚗',
    color: '#FF5722',
  },
  {
    name: 'Belanja',
    type: 'expense' as const,
    icon: '🛒',
    color: '#E91E63',
  },
  {
    name: 'Hiburan',
    type: 'expense' as const,
    icon: '🎬',
    color: '#673AB7',
  },
  {
    name: 'Kesehatan',
    type: 'expense' as const,
    icon: '🏥',
    color: '#3F51B5',
  },
  {
    name: 'Pendidikan',
    type: 'expense' as const,
    icon: '📚',
    color: '#009688',
  },
  {
    name: 'Tagihan',
    type: 'expense' as const,
    icon: '📄',
    color: '#795548',
  },
  {
    name: 'Lainnya',
    type: 'expense' as const,
    icon: '📤',
    color: '#9E9E9E',
  },
];

async function seed() {
  console.log('🌱 Seeding database...');

  const passwordHash = await hashPassword('password123');
  const [demoUser] = await db
    .insert(users)
    .values({
      email: 'demo@gfinance.com',
      name: 'Demo User',
      passwordHash,
    })
    .returning();

  console.log(`✅ Created demo user: ${demoUser!.email}`);

  const categoryValues = DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    userId: demoUser!.id,
  }));

  await db.insert(categories).values(categoryValues);
  console.log(`✅ Created ${categoryValues.length} default categories`);

  console.log('🎉 Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
