# G-Finance API

Personal finance tracking REST API built with Elysia, Bun, PostgreSQL, and Drizzle ORM.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia v1.4
- **Database**: PostgreSQL 16+
- **ORM**: Drizzle ORM
- **Auth**: JWT (access + refresh token with rotation)
- **Password Hashing**: Argon2id (Bun.password)

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL 16+

## Getting Started

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start PostgreSQL (if using Docker)
docker compose up -d

# Run database migrations
bun run db:push

# Seed database (optional - creates demo user + default categories)
bun run db:seed

# Start development server
bun run dev
```

## Available Scripts

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `bun run dev`         | Start dev server with hot reload |
| `bun run start`       | Start production server          |
| `bun run db:generate` | Generate migration files         |
| `bun run db:migrate`  | Run migrations                   |
| `bun run db:push`     | Push schema to database          |
| `bun run db:studio`   | Open Drizzle Studio              |
| `bun run db:seed`     | Seed database                    |

## API Documentation

After starting the server, visit `http://localhost:3000/swagger` for interactive API docs.

## API Endpoints

### Auth

- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user profile

### Users

- `PUT /api/users/me` - Update profile
- `POST /api/users/me/change-password` - Change password

### Wallets

- `GET /api/wallets` - List wallets
- `POST /api/wallets` - Create wallet
- `GET /api/wallets/:id` - Get wallet
- `PUT /api/wallets/:id` - Update wallet
- `DELETE /api/wallets/:id` - Deactivate wallet

### Categories

- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Transactions

- `GET /api/transactions` - List transactions (with filters & pagination)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/:id/attachments` - Upload attachment
- `DELETE /api/transactions/:id/attachments/:attachmentId` - Delete attachment
