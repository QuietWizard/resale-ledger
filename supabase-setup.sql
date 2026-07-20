-- Run this in the Supabase SQL editor for your project.

-- 1. Table
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  photo_url text,
  name text default 'New item',
  brand text,
  category text,
  condition_notes text,
  original_price text,
  price_low numeric,
  price_high numeric,
  suggested_price numeric,
  research_summary text,
  ebay_title text,
  ebay_description text,
  fb_description text,
  status text not null default 'processing',   -- 'processing' | 'ready' | 'archived'
  archived_at timestamptz
);

-- 2. Realtime: let the front end subscribe to live changes on this table
alter publication supabase_realtime add table items;

-- 3. Storage bucket for photos (public read so the feed can display thumbnails directly)
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

-- 4. RLS
-- This is a single-user personal tool living on your homelab network, so the simplest
-- approach is to allow the anon key full access to this one table/bucket rather than
-- building out real auth. If you ever expose this beyond your LAN/VPN, tighten this.
alter table items enable row level security;

create policy "allow all on items" on items
  for all using (true) with check (true);

create policy "allow all on item-photos" on storage.objects
  for all using (bucket_id = 'item-photos') with check (bucket_id = 'item-photos');
