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

After starting the server, visit `http://localhost:3000/swagger` for interactive API docs (includes **Buckets**, **Allocations**, and **`POST /transactions/wallet-transfer`** under Transactions).

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

Reported **`balance`** is **recalculated from transactions**: income and expense on the primary `walletId`, plus **transfers** where this wallet is the destination (`toWalletId`) or source (`fromWalletId`). See [Allocations](#allocations) for transfers tagged with a **bucket**.

#### `GET /wallets`

**Query parameters** (optional)

| Param  | Type   | Description                                      |
| ------ | ------ | ------------------------------------------------ |
| `type` | string | Filter: `bank`, `e-wallet`, `cash`, `savings`, `investment` |

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
    "deletedAt": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

`balance` is a JSON **number** (bukan string desimal). `deletedAt` adalah ISO datetime atau `null` jika dompet masih aktif.

`type` is one of: `bank`, `e-wallet`, `cash`, `savings`, `investment`.

---

#### `POST /wallets`

**Body** (`application/json`)

| Field      | Type   | Notes                                                                                                         |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `name`     | string | 1–255 characters                                                                                              |
| `type`     | string | `bank` \| `e-wallet` \| `cash` \| `savings` \| `investment`                                                   |
| `balance`  | number | Optional; default `0`; must be ≥ 0 (JSON number, sama seperti respons)                                       |
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

**`type`** pada kategori hanya **`income`** atau **`expense`**. Diatur saat **create** dan **tidak** bisa diubah lewat `PUT` (buat kategori baru jika perlu tipe lain). Tabungan / dana tujuan terpisah ada di [Buckets](#buckets) dan alur [Allocations](#allocations), bukan sebagai tipe kategori.

Property **`icon`** (nullable) menyimpan nama **komponen Lucide Vue** ([`lucide-vue-next`](https://lucide.dev)) dalam **PascalCase** (mis. `Wallet`, `CircleDollarSign`) — bukan emoji. `db:seed` membuat kategori default pendapatan dan pengeluaran (mis. `CircleDollarSign`, `ShoppingBasket`, `ReceiptText`).

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

| Param   | Type   | Description                         |
| ------- | ------ | ----------------------------------- |
| `type`  | string | Filter: `income` atau `expense`     |
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
| `type`  | string | `income` atau `expense`                                                                     |
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
  "message": "Category soft-deleted successfully"
}
```

---

### Transactions

All routes require **Bearer** access token.

The data model supports **`income`**, **`expense`**, **`transfer`** (termasuk alokasi ber-bucket). **`GET /transactions`** mengembalikan:

- semua **`income`** dan **`expense`** dalam rentang tanggal;
- plus **`transfer`** yang **bukan** alokasi bucket (**`bucketId` null**) — pemindahan antar dompet via **`POST /transactions/wallet-transfer`**.

Transfer yang punya **`bucketId`** (alur [Allocations](#allocations)) **tidak** muncul di endpoint ini — gunakan **`GET /allocations`**.

Saat **`POST /transactions`** atau **`PUT /transactions/:id`**, **`categoryId`** harus mengarah ke kategori **`type`** yang sama dengan transaksi (**hanya** `income` atau `expense`).

#### `GET /transactions`

Returns transactions **grouped by calendar day** (`transactionsByDay`). Each day’s `transactions` array is ordered by `createdAt` (newest first, matching the query). **Days** are ordered **newest date first** (e.g. 2026-01-16 before 2026-01-15). Only days that have at least one transaction appear.

**`startDate`** and **`endDate`** are **required** (inclusive `YYYY-MM-DD` filter). If `startDate` is after `endDate`, the API returns a validation error.

Optional filters: `type`, `walletId`, `categoryId`. Untuk **`transfer`** tanpa bucket, **`walletId`** / **`categoryId`** bisa **`null`**; gunakan **`fromWallet`** / **`toWallet`** pada item daftar. **`totalIncome`** / **`totalExpense`** hanya menjumlahkan baris **`income`** / **`expense`** (transfer tidak masuk total tersebut).

**Query parameters**

| Param        | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| `startDate`  | string | **yes**  | ISO date `YYYY-MM-DD` (inclusive) |
| `endDate`    | string | **yes**  | ISO date `YYYY-MM-DD` (inclusive) |
| `type`       | string | no       | `income` atau `expense` (filter ketat; transfer tidak ikut jika dipilih) |
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
          "fromWalletId": null,
          "toWalletId": null,
          "bucketId": null,
          "type": "expense",
          "amount": "100.50",
          "description": "Note",
          "transactionDate": "2026-01-16",
          "createdAt": "2026-01-01T00:00:00.000Z",
          "updatedAt": "2026-01-01T00:00:00.000Z",
          "categoryName": "Makanan",
          "walletName": "Main",
          "category": {
            "id": "<uuid>",
            "userId": "<uuid>",
            "name": "Makanan",
            "type": "expense",
            "icon": "ShoppingBasket",
            "color": "#F44336",
            "createdAt": "2026-01-01T00:00:00.000Z"
          },
          "wallet": {
            "id": "<uuid>",
            "userId": "<uuid>",
            "name": "Main",
            "type": "bank",
            "balance": "0.00",
            "currency": "IDR",
            "icon": null,
            "isActive": true,
            "createdAt": "2026-01-01T00:00:00.000Z",
            "updatedAt": "2026-01-01T00:00:00.000Z"
          },
          "fromWallet": null,
          "toWallet": null
        }
      ]
    }
  ],
  "totalIncome": "0.00",
  "totalExpense": "100.50"
}
```

Pada **`transfer`** dompet (tanpa bucket), **`wallet`** / **`category`** bisa **`null`** dan **`fromWallet`** / **`toWallet`** terisi (saldo dompet di objek embed adalah string desimal).

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

**Response** `200` — objek transaksi: `id`, `walletId`, `categoryId`, `fromWalletId`, `toWalletId`, `bucketId`, `isAllocationWithdraw` (jika relevan), `type`, `amount`, `description`, `transactionDate`, `createdAt`, `updatedAt`, `walletName`, `categoryName`, **`attachments`** (array jika ada).

---

#### `POST /transactions/wallet-transfer`

Membuat **`transfer`** antar dompet **tanpa** bucket ( **`bucketId` null** ). Tidak sama dengan **`POST /allocations`** (transfer ber-tag bucket).

**Body** (`application/json`)

| Field             | Type   | Notes                                                          |
| ----------------- | ------ | -------------------------------------------------------------- |
| `fromWalletId`    | string | UUID dompet sumber                                             |
| `toWalletId`      | string | UUID dompet tujuan                                             |
| `amount`          | string | Decimal string, pola sama seperti create transaksi             |
| `transactionDate` | string | ISO date `YYYY-MM-DD`                                          |
| `description`     | string | Opsional; max 500 karakter                                     |

**Response** **`204`** — tanpa body; saldo dompet diperbarui di server.

---

#### `GET /transactions/:id`

**Path parameters:** `id` (transaction UUID).

**Response** `200` — transaction object (may include `attachments`).

If the row is **`transfer`**, `walletId` and `categoryId` may be **`null`**, and the response can include: **`fromWalletId`**, **`toWalletId`**, **`bucketId`**, **`isAllocationWithdraw`**. Transfer ber-bucket dibuat lewat [Allocations](#allocations); transfer dompet tanpa bucket lewat **`POST /transactions/wallet-transfer`**. Nilai **`amount`** pada baris selalu positif menurut konvensi ledger.

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

**`PUT`** is not supported for rows with `type: transfer` (gunakan alur alokasi atau buat transfer baru; mengembalikan error validasi).

---

#### `DELETE /transactions/:id`

**Path parameters:** `id` (transaction UUID).

Deleting a **`transfer`** recalculates both affected wallets. Deleting an **income** or **expense** recalculates the related wallet. Attachments, if any, are removed from storage.

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

### Buckets

Savings / goal “envelopes” di tabel **`buckets`** (terpisah dari [Budgets](#budgets) bulanan). Saldo agregat per bucket dihitung dari **transfer** yang terhubung ke bucket itu (lihat [Allocations](#allocations)).

All routes require **Bearer** access token.

#### `GET /buckets`

**Response** `200` — array of bucket objects, each with an aggregate **`balance`** (decimal string from the transfer ledger, signed using internal rules for allocate vs withdraw):

```json
[
  {
    "id": "<uuid>",
    "name": "Dana darurat",
    "type": "emergency",
    "targetAmount": "1000000.00",
    "icon": "Shield",
    "color": "#2196F3",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "balance": "150000.00"
  }
]
```

#### `POST /buckets`

**Body** (`application/json`)

| Field          | Type   | Notes |
| -------------- | ------ | ----- |
| `name`         | string | Required; 1–100 characters |
| `type`         | string | Optional; e.g. `saving`, `emergency` |
| `targetAmount` | string | Optional; decimal string like transactions |
| `icon`         | string | Optional; max 100 characters |
| `color`        | string | Optional; max 20 characters |

**Response** `200` — created bucket (includes `id`, `userId`, `createdAt`, `updatedAt`, etc.; no `balance` until an allocation row exists).

---

### Allocations

Wallet-to-wallet **transfers** with an optional **bucket** tag (`type: transfer` in the database). The server runs operations in a **DB transaction** and recalculates **wallet** balances; wallet balance = income − expense + transfers in − transfers out for that wallet. Each allocation row stores **`isAllocationWithdraw`**: `false` for `POST /allocations`, `true` for `POST /allocations/withdraw`. Use these endpoints instead of `POST /transactions` for this flow.

All routes require **Bearer** access token.

**Route order (implementation):** specific paths are registered so `GET/POST` do not shadow each other: e.g. `GET /allocations/summary` and `POST /allocations/withdraw` are distinct from `GET/POST` `/allocations`.

#### `GET /allocations/summary`

**Response** `200`

```json
{
  "totalBalance": 5000000,
  "totalAllocated": 1200000,
  "available": 3800000
}
```

- **`totalBalance`**: sum of **non-deleted** wallet `balance` for the user.
- **`totalAllocated`**: sum of **signed** bucket-tagged **transfer** amounts (net from allocate vs withdraw).
- **`available`**: `totalBalance - totalAllocated`.

#### `GET /allocations`

**Query parameters** (optional)

| Param      | Type   | Description        |
| ---------- | ------ | ------------------ |
| `bucketId`        | string | Filter by bucket UUID (`uuid`) |

**Response** `200` — array of `transfer` rows with relations **`fromWallet`**, **`toWallet`**, **`bucket`** (simplified: wallet id, name, type, balance as string, currency; bucket id and name), ordered by `transactionDate` (newest first), then `createdAt`.

#### `POST /allocations`

**Body** (`application/json`)

| Field             | Type   | Notes |
| ----------------- | ------ | ----- |
| `fromWalletId`    | string | Source wallet UUID (must be yours) |
| `toWalletId`      | string | Destination wallet UUID |
| `bucketId`        | string | Bucket UUID |
| `amount`          | string | Decimal string; must be positive; source must have enough balance |
| `transactionDate` | string | `YYYY-MM-DD` |
| `description`     | string | Optional; max 500 characters |

**Response** `200` — objek transfer dengan `type: "transfer"`; **`fromWallet`**, **`toWallet`**, dan **`bucket`** biasanya **`null`** pada respons create — muat ulang dengan **`GET /allocations`** untuk relasi lengkap. Contoh bentuk:

```json
{
  "id": "<uuid>",
  "userId": "<uuid>",
  "type": "transfer",
  "isAllocationWithdraw": false,
  "fromWalletId": "<uuid>",
  "toWalletId": "<uuid>",
  "bucketId": "<uuid>",
  "amount": "50000.00",
  "description": null,
  "transactionDate": "2026-01-16",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "fromWallet": null,
  "toWallet": null,
  "bucket": null
}
```

#### `POST /allocations/withdraw`

Money movement marked as a **withdraw** from the bucket ledger (`isAllocationWithdraw: true`). The server checks **bucket net balance** and **source wallet** balance before inserting the transfer.

**Body** (`application/json`)

| Field             | Type   | Notes |
| ----------------- | ------ | ----- |
| `fromWalletId`    | string | Source wallet UUID |
| `toWalletId`      | string | Destination wallet UUID |
| `bucketId`        | string | Bucket UUID |
| `amount`          | string | Must not exceed bucket net and wallet balance (with validation messages) |
| `transactionDate` | string | Optional; default today `YYYY-MM-DD` |
| `description`     | string | Optional; max 500 characters |

**Response** `200` — created transfer, same response shape as `POST /allocations`.

---

### Budgets

Anggaran bulanan: **`totalBudget`** sebagai plafon keseluruhan dan **`items`** alokasi per kategori **pengeluaran**. Pengeluaran aktual dihitung dari **transaksi** **`type: expense`** dengan `categoryId` tidak null dalam bulan kalender tersebut; baris **transfer** tidak ikut.

**Perilaku**

- **`GET /budgets`** hanya mengembalikan **ringkasan agregat** untuk bulan itu (`period`, `budget` opsional, `totals`) — **tanpa** daftar perkategori.
- **`GET /budgets/items`** mengembalikan satu baris per kategori **expense** (dengan pagination): `hasBudget`, nominal alokasi/aktual, sisa, persentase progres, dll.
- Jika belum ada budget untuk bulan itu, **`GET /budgets`** mengembalikan **`budget: null`** dan **`totals.totalAllocated`** bernilai **`"0.00"`**; pada **`GET /budgets/items`** setiap kategori pengeluaran tetap ada dengan **`hasBudget: false`**.
- **`PUT /budgets`** mewajibkan **`totalBudget`** sebagai angka **lebih dari 0**; jumlah **`items[].allocatedAmount`** tidak boleh melebihi **`totalBudget`**.
- **`allocatedAmount` − `actualAmount` = `remaining`** (positif = di bawah anggaran baris tersebut).
- **`totals.totalActual`** (di **`GET /budgets`**) = total pengeluaran expense di bulan itu. **`totals.totalAllocated`** = nilai **`budget.totalBudget`** jika ada budget, selain itu **`"0.00"`** — ini **bukan** jumlah alokasi per kategori.

#### `GET /budgets`

**Query parameters** (required)

| Param   | Type   | Description        |
| ------- | ------ | ------------------ |
| `year`  | string | e.g. `2026`        |
| `month` | string | `1`–`12`           |

**Response** `200`

```json
{
  "period": {
    "year": 2026,
    "month": 1,
    "startDate": "2026-01-01",
    "endDate": "2026-01-31"
  },
  "budget": {
    "id": "<uuid>",
    "totalBudget": "5000000.00",
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "totals": {
    "totalAllocated": "5000000.00",
    "totalActual": "120000.00"
  }
}
```

`budget` dapat **`null`** jika belum ada data anggaran untuk bulan tersebut.

---

#### `GET /budgets/items`

Daftar **budget vs actual** per kategori pengeluaran untuk satu bulan, dengan pagination.

**Query parameters**

| Param   | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| `year`  | string | **yes**  | e.g. `2026` |
| `month` | string | **yes**  | `1`–`12` |
| `page`  | string | no       | Default `"1"` |
| `limit` | string | no       | Default `"10"`; maksimum **100** |

**Response** `200`

```json
{
  "period": {
    "year": 2026,
    "month": 1,
    "startDate": "2026-01-01",
    "endDate": "2026-01-31"
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "totalPages": 2
  },
  "items": [
    {
      "category": {
        "id": "<uuid>",
        "name": "Makanan",
        "type": "expense",
        "icon": "ShoppingBasket",
        "color": "#F44336",
        "createdAt": "2026-01-01T00:00:00.000Z"
      },
      "hasBudget": true,
      "allocatedAmount": "500000.00",
      "actualAmount": "120000.00",
      "remaining": "380000.00",
      "progressPercent": 24,
      "isOverBudget": false
    }
  ]
}
```

---

#### `PUT /budgets`

Membuat atau **mengganti seluruh** budget untuk bulan tersebut (baris **`items`** diganti penuh). Setiap `categoryId` harus kategori **`expense`** milik user.

**Body** (`application/json`)

| Field          | Type   | Notes |
| -------------- | ------ | ----- |
| `year`         | number | 1970–2100 |
| `month`        | number | 1–12 |
| `totalBudget`  | number | **Wajib**; harus lebih dari 0 (plafon bulanan) |
| `items`        | array  | `{ "categoryId": "<uuid>", "allocatedAmount": <number> }`; **`allocatedAmount`** ≥ 0; tidak boleh duplikat `categoryId`; **jumlah semua `allocatedAmount` ≤ `totalBudget`** |

**Response** `200` — sama seperti **`GET /budgets`** untuk bulan yang sama (ringkasan agregat saja).

---

#### `DELETE /budgets/:id`

**Path parameters:** `id` — budget UUID (dari **`GET /budgets`** → `budget.id`).

**Response** `200`

```json
{
  "message": "Budget deleted successfully"
}
```

Run migrations after pulling: `bun run db:migrate` (or `db:push` in dev).
