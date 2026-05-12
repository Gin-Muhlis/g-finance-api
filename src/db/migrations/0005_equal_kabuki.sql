ALTER TABLE "wallets" ADD COLUMN "balance_baseline" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
-- Pertahankan saldo saat ini: baseline = balance − net transaksi (agar balance = baseline + net).
UPDATE wallets AS w
SET balance_baseline = COALESCE(w.balance::numeric, 0) - COALESCE(
  (
    SELECT SUM(x.delta)::numeric
    FROM (
      SELECT t.amount::numeric AS delta
      FROM transactions t
      WHERE t.type = 'income' AND t.wallet_id = w.id
      UNION ALL
      SELECT -t.amount::numeric
      FROM transactions t
      WHERE t.type = 'expense' AND t.wallet_id = w.id
      UNION ALL
      SELECT t.amount::numeric
      FROM transactions t
      WHERE t.type = 'transfer' AND t.to_wallet_id = w.id
      UNION ALL
      SELECT -t.amount::numeric
      FROM transactions t
      WHERE t.type = 'transfer' AND t.from_wallet_id = w.id
    ) AS x
  ),
  0
);
--> statement-breakpoint
