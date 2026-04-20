import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './schema/users.ts';
import { categories } from './schema/categories.ts';
import { hashPassword } from '../utils/hash.ts';
import { DEFAULT_CATEGORIES } from '../common/default-categories.ts';

const DATABASE_URL = process.env.DATABASE_URL!;
const client = postgres(DATABASE_URL);
const db = drizzle(client);

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
