DO $do$ BEGIN
	CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $do$;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "type" SET DATA TYPE "public"."category_type" USING (
	CASE lower(trim("type"::text))
		WHEN 'allocation' THEN 'expense'::"public"."category_type"
		WHEN 'income' THEN 'income'::"public"."category_type"
		WHEN 'expense' THEN 'expense'::"public"."category_type"
		ELSE 'expense'::"public"."category_type"
	END
);
