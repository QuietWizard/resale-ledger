-- Run this in the Supabase SQL editor for your project.
-- Schema matches n8n/resell-ledger-ai-workflow.json — see that file's node notes for
-- exactly which node writes each column.

-- 1. Table
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  photo_url text,

  -- Captured from the seller at photo-capture time; sent verbatim to n8n as the
  -- webhook payload (item_id, photo_url, name, seller_condition, missing_items, seller_notes).
  name text,
  seller_condition text,   -- 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'
  missing_items text,
  seller_notes text,

  -- Pipeline status, written by n8n.
  ai_status text not null default 'processing',   -- 'processing' | 'complete' | 'failed'
  error_message text,
  error_step text,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,

  -- Identification + research (n8n: Save All Results to Supabase).
  identified_product_name text,
  brand text,
  model text,
  model_number text,
  category text,
  subcategory text,
  item_color text,
  dimensions jsonb,
  key_features jsonb,
  condition_description text,
  whats_included jsonb,

  -- Valuation.
  original_retail_price numeric,
  current_new_price numeric,
  market_value numeric,
  price_sell_fast numeric,
  price_maximize_profit numeric,
  recommended_price numeric,
  price_range_low numeric,
  price_range_high numeric,
  pricing_rationale text,
  best_platform text,

  -- eBay listing draft.
  ebay_title text,
  ebay_subtitle text,
  ebay_condition_tier text,
  ebay_condition_description text,
  ebay_description text,          -- HTML
  ebay_item_specifics jsonb,
  ebay_buy_it_now_price numeric,
  ebay_auction_start_price numeric,

  -- Facebook Marketplace draft.
  fb_title text,
  fb_price numeric,
  fb_description text,
  fb_category text,
  fb_hashtags jsonb,

  -- App-level archive state (independent of ai_status).
  archived_at timestamptz
);

-- 2. Realtime: let the front end subscribe to live changes on this table
alter publication supabase_realtime add table listings;

-- 3. Storage bucket for photos (public read so the feed can display thumbnails directly)
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- 4. RLS
-- This is a single-user personal tool living on your homelab network, so the simplest
-- approach is to allow the anon key full access to this one table/bucket rather than
-- building out real auth. If you ever expose this beyond your LAN/VPN, tighten this.
alter table listings enable row level security;

create policy "allow all on listings" on listings
  for all using (true) with check (true);

create policy "allow all on listing-photos" on storage.objects
  for all using (bucket_id = 'listing-photos') with check (bucket_id = 'listing-photos');
