-- 1. FIX WISHLISTS TABLE
create table if not exists wishlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, product_id)
);

-- Enable RLS for Wishlists
alter table wishlists enable row level security;

-- Wishlist Policies
create policy "Users can view their own wishlist" on wishlists for select using (auth.uid() = user_id);
create policy "Users can insert into their own wishlist" on wishlists for insert with check (auth.uid() = user_id);
create policy "Users can delete from their own wishlist" on wishlists for delete using (auth.uid() = user_id);

-- 2. FIX ORDERS RELATIONSHIP (order_items -> orders)
-- Check if foreign key exists, if not, add it.
-- We drop it first to be safe and re-add it to ensure Supabase detects the relationship.
alter table order_items drop constraint if exists order_items_order_id_fkey;

alter table order_items 
  add constraint order_items_order_id_fkey 
  foreign key (order_id) 
  references orders(id) 
  on delete cascade;

-- 3. FIX ADMIN POLICIES (Allow Admin to view ALL wishlists)
create policy "Admins can view all wishlists"
  on wishlists for select
  using (
      exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin'
      )
  );

-- 4. ENSURE ORDER_ITEMS POLICIES
alter table order_items enable row level security;

create policy "Users can view their own order items" on order_items for select using (
  exists (
    select 1 from orders
    where orders.id = order_items.order_id
    and orders.user_id = auth.uid()
  )
);

create policy "Admins can view all order items" on order_items for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
