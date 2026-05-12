-- Hapus nilai legacy category_type 'allocation' dari baris categories.
-- Kolom bisa bertipe text (migrasi 0004 tertunda) atau enum lama; aman idempotent jika sudah bersih.
UPDATE categories
SET type = 'expense'
WHERE lower(trim(type::text)) IN ('allocation');
