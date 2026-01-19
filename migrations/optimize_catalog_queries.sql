-- OPTIMIZATION: Improve Catalog Filtering Performance
-- Run this in Supabase SQL Editor

-- 1. Ensure indexes for joining products and variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_available ON public.product_variants(available);
CREATE INDEX IF NOT EXISTS idx_product_variants_general_color ON public.product_variants(general_color);

-- 2. Index for category filtering
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- 3. Cleanup NULLs (if any) to ensure numeric filters work correctly
UPDATE public.product_variants 
SET available = 0 
WHERE available IS NULL;

UPDATE public.product_variants 
SET stock = 0 
WHERE stock IS NULL;
