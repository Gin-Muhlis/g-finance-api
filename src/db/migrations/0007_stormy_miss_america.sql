ALTER TABLE "categories" ALTER COLUMN "type" SET DATA TYPE varchar(20) USING ("type"::text);--> statement-breakpoint
DROP TYPE IF EXISTS "public"."category_type";