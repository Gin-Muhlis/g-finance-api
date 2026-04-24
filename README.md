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

## API reference

Base URL: `/api` (all routes below are prefixed with `/api` unless noted).

### Authentication

Routes under **Auth** that are not `POST /auth/register`, `POST /auth/login`, or `POST /auth/refresh` require a valid JWT access token:

```http
Authorization: Bearer <accessToken>
```

### Error responses

Unless otherwise noted, errors use JSON with `error` (machine-readable code) and `message` (human-readable text). Examples:

| HTTP status | Typical `error`         | When                                 |
| ----------- | ----------------------- | ------------------------------------ |
| 401         | `UNAUTHORIZED`          | Missing/invalid/expired token        |
| 403         | `FORBIDDEN`             | Access denied for resource           |
| 404         | `NOT_FOUND`             | Resource or route not found          |
| 409         | `CONFLICT`              | e.g. duplicate email                 |
| 422         | `VALIDATION_ERROR`      | Request body/query validation failed |
| 500         | `INTERNAL_SERVER_ERROR` | Unexpected server error              |

---

### Root (no `/api` prefix)

#### `GET /`

**Response** `200`

```json
{
  "name": "G-Finance API",
  "version": "1.0.0",
  "docs": "/swagger"
}
```

---

### Auth

#### `POST /auth/register`

**Body** (`application/json`)

| Field      | Type   | Constraints        |
| ---------- | ------ | ------------------ |
| `email`    | string | Valid email format |
| `name`     | string | 1–255 characters   |
| `password` | string | 8–128 characters   |

**Response** `200`

```json
{
  "id": "<uuid>",
  "email": "user@example.com",
  "name": "Display Name",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

#### `POST /auth/login`

**Body** (`application/json`)

| Field        | Type    | Constraints                  |
| ------------ | ------- | ---------------------------- |
| `email`      | string  | Valid email format           |
| `password`   | string  | Min length 1                 |
| `rememberMe` | boolean | Optional; default `false`    |
| `deviceInfo` | string  | Optional; max 512 characters |

**Response** `200`

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

---

#### `POST /auth/refresh`

**Body** (`application/json`)

| Field          | Type   | Constraints  |
| -------------- | ------ | ------------ |
| `refreshToken` | string | Min length 1 |

**Response** `200`

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

---

#### `POST /auth/logout`

**Body** (`application/json`)

| Field          | Type   | Constraints  |
| -------------- | ------ | ------------ |
| `refreshToken` | string | Min length 1 |

**Response** `200`

```json
{
  "message": "Logged out successfully"
}
```

---

#### `GET /auth/me`

**Auth:** Bearer access token required.

**Response** `200`

```json
{
  "id": "<uuid>",
  "email": "user@example.com",
  "name": "Display Name",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

### Users

All routes require **Bearer** access token.

#### `PUT /users/me`

**Body** (`application/json`)

| Field  | Type   | Constraints                 |
| ------ | ------ | --------------------------- |
| `name` | string | Optional; 1–255 if provided |

**Response** `200` — same shape as `GET /auth/me`.

---

#### `POST /users/me/change-password`

**Body** (`application/json`)

| Field             | Type   | Constraints      |
| ----------------- | ------ | ---------------- |
| `currentPassword` | string | Min length 1     |
| `newPassword`     | string | 8–128 characters |

**Response** `200`

```json
{
  "message": "Password changed successfully"
}
```

---

### Wallets

All routes require **Bearer** access token.

#### `GET /wallets`

**Response** `200` — JSON array of wallet objects:

```json
[
  {
    "id": "<uuid>",
    "name": "Main account",
    "type": "bank",
    "balance": 0,
    "currency": "IDR",
    "icon": "Landmark",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

`type` is one of: `bank`, `e-wallet`, `cash`, `savings`, `investment`.

---

#### `POST /wallets`

**Body** (`application/json`)

| Field      | Type   | Notes                                                                                                         |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `name`     | string | 1–255 characters                                                                                              |
| `type`     | string | `bank` \| `e-wallet` \| `cash` \| `savings` \| `investment`                                                   |
| `balance`  | number | Optional; default `0`; must be ≥ 0                                                                            |
| `currency` | string | Optional; default `"IDR"`; max 10 chars                                                                       |
| `icon`     | string | Optional; Lucide Vue icon name (PascalCase), max 100 characters — see [Lucide icon names](#lucide-icon-names) |

**Response** `200` — single wallet object (same fields as one element in the list above).

---

#### `GET /wallets/:id`

**Path parameters**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | Wallet UUID |

**Response** `200` — single wallet object.

---

#### `PUT /wallets/:id`

**Path parameters:** `id` (wallet UUID).

**Body** (`application/json`) — all fields optional:

| Field      | Type    | Notes                                                 |
| ---------- | ------- | ----------------------------------------------------- |
| `name`     | string  | 1–255 if provided                                     |
| `type`     | string  | Same enum as create                                   |
| `balance`  | number  | Optional; must be ≥ 0 if provided                     |
| `currency` | string  | Max 10 characters                                     |
| `icon`     | string  | Lucide Vue icon name (PascalCase), max 100 characters |
| `isActive` | boolean |                                                       |

**Response** `200` — updated wallet object.

---

#### `DELETE /wallets/:id`

**Path parameters:** `id` (wallet UUID). Deactivates the wallet (soft delete).

**Response** `200` — wallet object after update (including `isActive`).

---

### Categories

All routes require **Bearer** access token.

**`type`** on a category is one of: `income`, `expense`, or **`allocation`**. It is set at **create** time only and **cannot** be changed later. Use **`allocation`** for budgeting / savings buckets (e.g. emergency fund, goal-based pots). Transactions only support `income` and `expense`; you **cannot** attach an `allocation` category to a transaction (see [Transactions](#transactions)).

Property **`icon`** (nullable) stores the **Lucide Vue** ([`lucide-vue-next`](https://lucide.dev)) icon **component name** in **PascalCase** (e.g. `Wallet`, `CircleDollarSign`) — not emoji. The client resolves the string to a component from the library. Registration and `db:seed` create default categories (income, expense, and **allocation** buckets such as `PiggyBank`, `Vault`, `ChartPie`) alongside names like `CircleDollarSign`, `ShoppingBasket`, `ReceiptText`.

#### Lucide icon names

Examples you can store (same naming as exported components from `lucide-vue-next`):

- **Money & currency:** `Banknote`, `BanknoteArrowUp`, `BanknoteArrowDown`, `BanknoteX`, `Coins`, `HandCoins`, `CircleDollarSign`, `DollarSign`, `BadgeDollarSign`, `BadgeEuro`, `BadgeIndianRupee`, `Euro`, `IndianRupee`, `Receipt`, `ReceiptText`, `Bitcoin`, `Percent`, …
- **Wallets & banking:** `Wallet`, `WalletCards`, `WalletMinimal`, `CreditCard`, `Landmark`, `Building`, `Building2`, `PiggyBank`, `Vault`, `IdCard`, `Lock`, `Shield`, `ShieldCheck`, `QrCode`, `Nfc`, …
- **Charts & trends:** `Activity`, `ChartBar`, `ChartLine`, `ChartPie`, `TrendingUp`, `TrendingDown`, `FileSpreadsheet`, `Table`, …
- **Flows & transactions:** `ArrowUpRight`, `ArrowDownRight`, `ArrowLeftRight`, `CircleArrowUp`, `CircleArrowDown`, `Repeat`, `RefreshCw`, …
- **General:** `Calculator`, `Scale`, `Briefcase`, `BriefcaseBusiness`, `ShoppingCart`, `ShoppingBag`, `ShoppingBasket`, `Store`, …

See the full set on [Lucide icons](https://lucide.dev/icons/).

#### `GET /categories`

**Query parameters** (all optional)

| Param   | Type   | Description                                  |
| ------- | ------ | -------------------------------------------- |
| `type`  | string | Filter: `income`, `expense`, or `allocation` |
| `page`  | string | Default `"1"`; parsed as a positive integer  |
| `limit` | string | Default `"20"`; clamped between 1 and 100    |

Results are ordered by **name** (ascending).

**Response** `200`

```json
{
  "data": [
    {
      "id": "<uuid>",
      "name": "Makanan",
      "type": "expense",
      "icon": "ShoppingBasket",
      "color": "#F44336",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 17,
    "totalPages": 1
  }
}
```

---

#### `POST /categories`

**Body** (`application/json`)

| Field   | Type   | Notes                                                                                       |
| ------- | ------ | ------------------------------------------------------------------------------------------- |
| `name`  | string | 1–255 characters                                                                            |
| `type`  | string | `income`, `expense`, or `allocation`                                                        |
| `icon`  | string | Optional; Lucide Vue icon name (PascalCase), max 100 — e.g. `BadgeIndianRupee`, `ChartLine` |
| `color` | string | Optional; max 20 characters (e.g. hex)                                                      |

**Response** `200` — single category object.

---

#### `PUT /categories/:id`

**Path parameters:** `id` (category UUID).

**Body** (`application/json`) — all optional:

| Field   | Type   | Notes                                                 |
| ------- | ------ | ----------------------------------------------------- |
| `name`  | string | 1–255 if provided                                     |
| `icon`  | string | Lucide Vue icon name (PascalCase), max 100 characters |
| `color` | string | Max 20 characters                                     |

**`type`** cannot be updated; create a new category if you need a different type.

**Response** `200` — updated category object.

---

#### `DELETE /categories/:id`

**Path parameters:** `id` (category UUID).

**Response** `200`

```json
{
  "message": "Category deleted successfully"
}
```

---

### Transactions

All routes require **Bearer** access token.

When creating or updating a transaction, **`categoryId`** must refer to a category whose **`type`** matches the transaction’s **`type`** (`income` or `expense`). Categories with **`type: allocation`** cannot be used on transactions.

#### `GET /transactions`

Returns transactions **grouped by calendar day** (`transactionsByDay`). Each day’s `transactions` array is ordered by `createdAt` (newest first, matching the query). **Days** are ordered **newest date first** (e.g. 2026-01-16 before 2026-01-15). Only days that have at least one transaction appear.

**`startDate`** and **`endDate`** are **required** (inclusive `YYYY-MM-DD` filter). If `startDate` is after `endDate`, the API returns a validation error.

Optional filters: `type`, `walletId`, `categoryId`. Each list item still includes the full **transaction** row, **`categoryName`**, **`walletName`**, nested **category** and **wallet** (no attachment list on this endpoint). **`totalIncome`** / **`totalExpense`** sum `amount` for `income` / `expense` over the same filter window.

**Query parameters**

| Param        | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| `startDate`  | string | **yes**  | ISO date `YYYY-MM-DD` (inclusive) |
| `endDate`    | string | **yes**  | ISO date `YYYY-MM-DD` (inclusive) |
| `type`       | string | no       | `income` or `expense` |
| `walletId`   | string | no       | Filter by wallet UUID |
| `categoryId` | string | no       | Filter by category UUID |

**Response** `200`

```json
{
  "transactionsByDay": [
    {
      "transactionDate": "2026-01-16",
      "transactions": [
        {
          "id": "<uuid>",
          "userId": "<uuid>",
          "walletId": "<uuid>",
          "categoryId": "<uuid>",
          "type": "expense",
          "amount": "100.50",
          "description": "Note",
          "transactionDate": "2026-01-16",
          "createdAt": "2026-01-01T00:00:00.000Z",
          "updatedAt": "2026-01-01T00:00:00.000Z",
          "categoryName": "Makanan",
          "walletName": "Main",
          "category": { "id": "<uuid>", "name": "Makanan", "type": "expense" },
          "wallet": { "id": "<uuid>", "name": "Main", "type": "bank" }
        }
      ]
    }
  ],
  "totalIncome": "0.00",
  "totalExpense": "100.50"
}
```

A **day** appears only if there is at least one transaction on that day in the range.

---

#### `POST /transactions`

**Body** (`application/json`)

| Field             | Type   | Notes                                                          |
| ----------------- | ------ | -------------------------------------------------------------- |
| `walletId`        | string | UUID                                                           |
| `categoryId`      | string | UUID                                                           |
| `type`            | string | `income` or `expense`                                          |
| `amount`          | string | Decimal string, e.g. `100` or `99.50` (up to 2 decimal places) |
| `description`     | string | Optional; max 500 characters                                   |
| `transactionDate` | string | ISO date `YYYY-MM-DD`                                          |

**Response** `200` — single transaction object (`id`, `walletId`, `categoryId`, `type`, `amount`, `description`, `transactionDate`, `createdAt`, `updatedAt`, optional `attachments`).

---

#### `GET /transactions/:id`

**Path parameters:** `id` (transaction UUID).

**Response** `200` — transaction object (may include `attachments`).

---

#### `PUT /transactions/:id`

**Path parameters:** `id` (transaction UUID).

**Body** (`application/json`) — all fields optional:

| Field             | Type   | Notes                  |
| ----------------- | ------ | ---------------------- |
| `walletId`        | string | UUID                   |
| `categoryId`      | string | UUID                   |
| `type`            | string | `income` or `expense`  |
| `amount`          | string | Same pattern as create |
| `description`     | string | Max 500 characters     |
| `transactionDate` | string | ISO date `YYYY-MM-DD`  |

**Response** `200` — updated transaction object.

---

#### `DELETE /transactions/:id`

**Path parameters:** `id` (transaction UUID).

**Response** `200`

```json
{
  "message": "Transaction deleted successfully"
}
```

---

#### `POST /transactions/:id/attachments`

**Path parameters:** `id` (transaction UUID).

**Body** (`multipart/form-data`)

| Field  | Type | Description   |
| ------ | ---- | ------------- |
| `file` | file | Binary upload |

**Response** `200`

```json
{
  "id": "<uuid>",
  "filePath": "…",
  "fileName": "receipt.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 12345,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

#### `DELETE /transactions/:id/attachments/:attachmentId`

**Path parameters**

| Param          | Type   | Description      |
| -------------- | ------ | ---------------- |
| `id`           | string | Transaction UUID |
| `attachmentId` | string | Attachment UUID  |

**Response** `200`

```json
{
  "message": "Attachment deleted successfully"
}
```

---

### Budgets

Monthly **expense** budgets per category. Actual spending comes from existing **transactions** (`type: expense`) in the calendar month—no changes to the transaction model. Only categories with `type: expense` are included.

**Behaviour**

- If no budget exists for the requested month, `budget` is `null` and every expense category still appears with `hasBudget: false` (UI: “No budget”).
- **`allocatedAmount` − `actualAmount` = `remaining`** (positive = under budget, negative = over budget / use red in UI).
- **`progressPercent`** = `actual / allocated × 100` (can exceed 100 when over budget).
- **`isOverBudget`** is `true` when actual spending exceeds the line allocation.
- **`totals.totalActual`**: sum of actual spending across all expense categories in the month (one aggregate query). **`totals.totalAllocated`**: sum of line allocations where a budget line exists.

#### `GET /budgets`

**Query parameters** (required)

| Param   | Type   | Description        |
| ------- | ------ | ------------------ |
| `year`  | string | e.g. `2026`        |
| `month` | string | `1`–`12`           |

**Response** `200` — period bounds, optional parent `budget`, one row per **expense** category with `hasBudget`, `allocatedAmount`, `actualAmount`, `remaining`, `progressPercent`, `isOverBudget`, and embedded `category`.

#### `PUT /budgets`

Creates or **replaces** the budget for that month (line items are fully replaced). Each `categoryId` must be an **expense** category owned by the user.

**Body** (`application/json`)

| Field          | Type   | Notes |
| -------------- | ------ | ----- |
| `year`         | number |       |
| `month`        | number | 1–12  |
| `totalBudget`  | string | Optional; overall cap; decimal string |
| `items`        | array  | `{ "categoryId", "allocatedAmount" }` (amount pattern like transactions) |

**Response** `200` — same shape as `GET /budgets` for that month.

#### `DELETE /budgets/:id`

**Path parameters:** `id` — budget UUID (from `GET` response `budget.id`).

**Response** `200`

```json
{
  "message": "Budget deleted successfully"
}
```

Run migrations after pulling: `bun run db:migrate` (or `db:push` in dev).
