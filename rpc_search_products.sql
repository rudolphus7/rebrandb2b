-- Drop the function first to ensure a clean update
drop function if exists search_products;

-- Create the function with SECURITY DEFINER to bypass RLS
create or replace function search_products(keyword text)
returns setof products
language sql
security definer -- Run as the creator (admin) to bypass RLS policies
set search_path = public -- Ensure we use the public schema
as $$
  select *
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
