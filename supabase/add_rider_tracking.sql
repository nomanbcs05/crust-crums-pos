-- 1. Ensure orders table has rider_name column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rider_name') THEN
        ALTER TABLE orders ADD COLUMN rider_name TEXT;
    END IF;
END $$;

-- 2. Ensure rider_deposits table exists
CREATE TABLE IF NOT EXISTS rider_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS and add policies for rider_deposits
ALTER TABLE rider_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on rider_deposits" ON rider_deposits;
CREATE POLICY "Allow public read access on rider_deposits" ON rider_deposits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access on rider_deposits" ON rider_deposits;
CREATE POLICY "Allow public insert access on rider_deposits" ON rider_deposits FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on rider_deposits" ON rider_deposits;
CREATE POLICY "Allow public update access on rider_deposits" ON rider_deposits FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access on rider_deposits" ON rider_deposits;
CREATE POLICY "Allow public delete access on rider_deposits" ON rider_deposits FOR DELETE USING (true);
