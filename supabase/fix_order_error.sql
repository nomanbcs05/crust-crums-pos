-- Fix for PGRST116 "JSON object requested, multiple (or no) rows returned"
-- This error happens during order creation because Row Level Security (RLS) policies 
-- allow INSERTing the order, but prevent SELECTing it back immediately after.

-- The easiest fix to guarantee the POS works is to disable RLS on these tables, 
-- or provide a full-access policy. Run this in your Supabase SQL Editor:

-- Enable full read/write access for Orders
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Enable full read/write access for Order Items
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- (Optional) If you MUST keep RLS enabled, uncomment and run these lines instead:
/*
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable full access to orders" ON public.orders;
CREATE POLICY "Enable full access to orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable full access to order items" ON public.order_items;
CREATE POLICY "Enable full access to order items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
*/
