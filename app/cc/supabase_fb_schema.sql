-- Create a table to store Facebook Page tokens and configuration
create table if not exists fb_page_config (
  id uuid default uuid_generate_v4() primary key,
  page_id text unique not null,
  page_name text,
  access_token text, -- Long-lived token
  app_id text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table fb_page_config enable row level security;

-- Policy to allow authenticated select/update (adjust usage as needed)
create policy "Enable read access for authenticated users"
on fb_page_config for select
to authenticated
using (true);

create policy "Enable update access for authenticated users"
on fb_page_config for update
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on fb_page_config for insert
to authenticated
with check (true);
