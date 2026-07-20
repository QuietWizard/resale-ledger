# Resale Ledger

Photograph a household item, get back a priced, ready-to-post eBay + Facebook
Marketplace listing draft. Front end only — the actual identify/research/draft
work happens in an n8n workflow that writes results back to Supabase.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Storage + Realtime) for data
- n8n (self-hosted) for the AI pipeline — triggered by webhook, not cron

## Setup

1. **Supabase**
   - Create a project at supabase.com (or point at your self-hosted instance).
   - Open the SQL editor and run `supabase-setup.sql` from this repo.
   - Copy your Project URL and anon key from Settings → API.

2. **Env vars**
   - `cp .env.local.example .env.local`
   - Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
     `NEXT_PUBLIC_N8N_CAPTURE_WEBHOOK_URL` (see below).

3. **Run it**
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:3000. Capture works and writes to Supabase even before
   the n8n workflow exists — items will just sit at "processing" forever until
   n8n is wired up.

## n8n workflow (build this in your n8n instance)

Unlike the youtube-summary workflow (1-hour cron, pulls new videos), this one
is **event-driven** — it does nothing until the front end calls its webhook.

**Trigger:** Webhook node, POST `/resale-capture`, receives `{ item_id, photo_url }`.

1. **Identify** — HTTP Request to the Claude API (vision), given `photo_url`.
   Prompt: *"Identify this object. Return JSON: {name, brand, model, category,
   condition_notes}. If brand/model isn't visible, say so explicitly rather
   than guessing."*

2. **Research** — HTTP Request to the Claude API with the `web_search` tool
   enabled, given the identification JSON. Prompt: *"Search for (1) this
   item's original MSRP if it's a known product, (2) current asking prices on
   resale/marketplace sites. Return JSON: {original_price, price_low,
   price_high, suggested_price, research_summary}."*
   Note: there's no public API for eBay "sold" comps (Terapeak requires an
   eBay Store subscription, and scraping eBay's sold-listings page would
   violate their terms) — this step reasons from active listings and general
   market info, not scraped sold data. `research_summary` should say so.

3. **Draft** — HTTP Request to the Claude API, given the combined JSON so far.
   Prompt: *"Write two listings. One eBay-style (detailed, keyword-rich title,
   structured condition/spec description). One Facebook Marketplace-style
   (short, casual, local-pickup framing). Return JSON: {ebay_title,
   ebay_description, fb_description}."*

4. **Write back to Supabase** — use n8n's Supabase node (or an HTTP Request to
   the Supabase REST API) to `UPDATE items SET ... WHERE id = {{item_id}}`,
   setting `status = 'ready'` and all the fields gathered above.

Because the front end subscribes to Supabase Realtime, the moment this last
step commits, the item flips from "processing" to showing its price and
drafts — no polling needed.

## Notes

- RLS on `items` and the `item-photos` bucket is currently wide open (see
  `supabase-setup.sql`) since this is a single-user tool on your own network.
  Tighten it if you ever expose this beyond your LAN/VPN.
- Photos are stored in the public `item-photos` Supabase Storage bucket so the
  feed can render thumbnails directly via their public URL.
