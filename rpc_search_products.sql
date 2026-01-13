-- Create a function to search products by title or vendor_article
create or replace function search_products(keyword text)
returns setof products
language sql
as $$
  select *
  from products
  where
    title ilike '%' || keyword || '%'
    or
    vendor_article::text ilike '%' || keyword || '%'
  limit 10;
$$;
