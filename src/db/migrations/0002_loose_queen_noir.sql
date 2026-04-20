ALTER TABLE "categories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "wallet_name" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_name" varchar(255);--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "transactions" AS t SET "wallet_name" = w."name" FROM "wallets" AS w WHERE t."wallet_id" = w."id" AND t."wallet_name" IS NULL;--> statement-breakpoint
UPDATE "transactions" AS t SET "category_name" = c."name" FROM "categories" AS c WHERE t."category_id" = c."id" AND t."category_name" IS NULL;