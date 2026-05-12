ALTER TABLE "categories" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "categories" SET "type" = 'expense' WHERE "type" = 'allocation';--> statement-breakpoint
DROP TYPE "public"."category_type";--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "type" SET DATA TYPE "public"."category_type" USING (
	CASE lower(trim(type))
		WHEN 'allocation' THEN 'expense'::"public"."category_type"
		WHEN 'income' THEN 'income'::"public"."category_type"
		WHEN 'expense' THEN 'expense'::"public"."category_type"
		ELSE 'expense'::"public"."category_type"
	END
);