-- Drop the function first to ensure a clean update
drop function if exists search_products;

-- Create the function with SECURITY DEFINER to bypass RLS
-- This version explicitly converts the images array to JSON format
create or replace function search_products(keyword text)
returns table (
  id uuid,
  title text,
  slug text,
  price numeric,
  vendor_article text,
  images text[],  -- Keep as text array, Supabase JS will handle conversion
  description text,
  category_id uuid,
  stock integer,
  created_at timestamptz,
  is_new boolean,
  is_promo boolean,
  is_sale boolean,
  old_price numeric
)
language sql
security definer -- Run as the creator (admin) to bypass RLS policies
set search_path = public -- Ensure we use the public schema
as $$
  select 
    id,
    title,
    slug,
    price,
    vendor_article,
    images,
    description,
    category_id,
    stock,
    created_at,
    is_new,
    is_promo,
    is_sale,
    old_price
  from products
  where
    title ilike '%' || keyword || '%'
    or
    vendor_article::text ilike '%' || keyword || '%'
  order by title
  limit 10;
$$;

-- TEST QUERY (Run this line separately to verify the function works in SQL Editor)
-- select * from search_products('ran');

-- To test the image format specifically, run:
-- select title, images, images[1] as first_image from search_products('ran');
