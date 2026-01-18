-- Migration: Add branding support to orders
-- Run this in Supabase SQL Editor

-- 1. Add branding columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS has_branding BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS branding_details JSONB;

-- 2. Create index for faster queries on orders with branding
CREATE INDEX IF NOT EXISTS idx_orders_has_branding ON orders(has_branding) WHERE has_branding = TRUE;

-- 3. Add comment to explain branding_details structure
COMMENT ON COLUMN orders.branding_details IS 'Stores branding information as JSON array: [{itemIndex: number, placement: string, size: string, method: string, price: number, logoFileName: string}]';

-- 4. Update existing orders to set has_branding = false if null
UPDATE orders SET has_branding = FALSE WHERE has_branding IS NULL;

-- Example of branding_details structure:
-- [
--   {
--     "itemIndex": 0,
--     "itemTitle": "T-Shirt Black M",
--     "placement": "chest-center",
--     "size": "medium",
--     "method": "screen-print",
--     "price": 80,
--     "logoFileName": "logo_SKU123.png"
--   }
-- ]

-- 5. Create a view for orders with branding (optional, for easier querying)
CREATE OR REPLACE VIEW orders_with_branding AS
SELECT 
    o.id,
    o.created_at,
    o.user_email,
    o.total_price,
    o.final_price,
    o.status,
    o.items,
    o.branding_details,
    jsonb_array_length(COALESCE(o.branding_details, '[]'::jsonb)) as branding_items_count
FROM orders o
WHERE o.has_branding = TRUE
ORDER BY o.created_at DESC;

-- 6. Grant permissions (adjust based on your RLS policies)
-- GRANT SELECT ON orders_with_branding TO authenticated;

COMMIT;
