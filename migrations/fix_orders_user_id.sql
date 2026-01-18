-- Migration: Add user_id column to orders table
-- Run this in Supabase SQL Editor if you get "Could not find 'user_id' column" error

-- 1. Add user_id column as UUID
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- 3. Comment for clarity
COMMENT ON COLUMN orders.user_id IS 'References the auth.users(id) to link orders to specific accounts';

-- 4. (Optional) Try to fill user_id from user_email if profiles match
-- This helps link existing orders to accounts
UPDATE orders o
SET user_id = p.id
FROM profiles p
WHERE o.user_email = p.email
AND o.user_id IS NULL;

COMMIT;
