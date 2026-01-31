-- NEW: Table for multi-angle product photos
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    view_name TEXT DEFAULT 'front', -- 'front', 'back', 'side', 'detail', etc.
    color TEXT, -- Links to product_variants.color for color-specific photos
    is_main BOOLEAN DEFAULT false, -- Set to true for the primary view
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_color ON public.product_images(product_id, color);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access (safe since it's just product catalog info)
DROP POLICY IF EXISTS "Allow public read access for product_images" ON public.product_images;
CREATE POLICY "Allow public read access for product_images" 
ON public.product_images FOR SELECT 
USING (true);

-- Allow authenticated users to manage images (Admins usually)
DROP POLICY IF EXISTS "Allow authenticated management for product_images" ON public.product_images;
CREATE POLICY "Allow authenticated management for product_images" 
ON public.product_images FOR ALL 
USING (auth.role() = 'authenticated');

-- OPTIONAL: Migrate existing main images from products table
-- Only run this once to populate the new table
INSERT INTO public.product_images (product_id, image_url, view_name, is_main)
SELECT id, image_url, 'front', true
FROM public.products
WHERE image_url IS NOT NULL 
AND image_url <> ''
ON CONFLICT DO NOTHING;

-- OPTIONAL: Migrate existing variant images
INSERT INTO public.product_images (product_id, image_url, view_name, color)
SELECT product_id, image_url, 'front', color
FROM public.product_variants
WHERE image_url IS NOT NULL 
AND image_url <> ''
ON CONFLICT DO NOTHING;
