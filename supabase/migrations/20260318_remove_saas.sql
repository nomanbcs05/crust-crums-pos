ALTER TABLE customers DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE orders DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE restaurant_tables DROP COLUMN IF EXISTS restaurant_id;
