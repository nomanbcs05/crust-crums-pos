-- Add customer_address to orders table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_address') THEN
        ALTER TABLE orders ADD COLUMN customer_address TEXT;
    END IF;
END $$;
