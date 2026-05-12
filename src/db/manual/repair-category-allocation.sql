-- Jalankan ke DB yang error: invalid input value for enum category_type: "allocation"
-- Setara dengan migrasi 0006_fix_allocation_categories (jalankan salah satu).
--
-- psql "$DATABASE_URL" -f src/db/manual/repair-category-allocation.sql

BEGIN;

UPDATE categories
SET type = 'expense'
WHERE lower(trim(type::text)) IN ('allocation');

COMMIT;
