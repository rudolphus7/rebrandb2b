-- Create wishlists table
create table if not exists wishlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, product_id)
);

-- Enable RLS
alter table wishlists enable row level security;

-- Policies
create policy "Users can view their own wishlist"
  on wishlists for select
  using (auth.uid() = user_id);

create policy "Users can insert into their own wishlist"
  on wishlists for insert
  with check (auth.uid() = user_id);

create policy "Users can delete from their own wishlist"
  on wishlists for delete
  using (auth.uid() = user_id);

-- Admin policy (Assuming admin checking logic generally allows viewing all, 
-- but for simplicity here we rely on service role or specific admin logic if implemented via RLS)
create policy "Admins can view all wishlists"
  on wishlists for select
  using (
      exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin' -- Adjust "role = 'admin'" to match your actual schema for admins
      )
  );
