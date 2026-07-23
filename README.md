# Resale Ledger

Photograph a household item, get back a priced, ready-to-post eBay + Facebook
Marketplace listing draft. Front end only — the actual identify/research/value/draft
work happens in an n8n workflow that writes results back to Supabase.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Storage + Realtime) for data
- n8n (self-hosted) for the AI pipeline — triggered by webhook, not cron

## Setup

1. **Supabase**
   - Create a project at supabase.com (or point at your self-hosted instance).
   - Open the SQL editor and run `supabase-setup.sql` from this repo. This creates the
     `listings` table, the `listing-photos` storage bucket, and enables Realtime.
   - Copy your Project URL and anon key from Settings → API.

2. **n8n**
   - Import [`n8n/resell-ledger-ai-workflow.json`](n8n/resell-ledger-ai-workflow.json)
     into your n8n instance and set the environment variables it needs (AI provider,
     Brave Search, eBay, Supabase service key, `WEBHOOK_SECRET`, etc. — see the node
     notes and the workflow's own webhook path `/resell-research`).
   - Activate the workflow and copy its webhook URL.

3. **Env vars**
   - `cp .env.local.example .env.local`
   - Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `NEXT_PUBLIC_N8N_CAPTURE_WEBHOOK_URL`, and `NEXT_PUBLIC_N8N_WEBHOOK_SECRET` (must
     match the `WEBHOOK_SECRET` env var configured on the n8n side).

4. **Run it**
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:3000. Capture works and writes to Supabase even before
   the n8n workflow exists — items will just sit at "processing" forever until
   n8n is wired up.

## How capture works

1. The **New Listing** page (`/new`) prompts for a photo (camera or upload), then shows
   a form for `name`, `seller_condition` (New / Like New / Good / Fair / Poor), and
   `missing_items` / `seller_notes` — all optional. The more of these the seller fills
   in, the more accurate the AI's condition-aware pricing and copy will be; leaving
   them blank still works, the workflow just falls back to "Unknown" condition.
2. On submit (`src/lib/capture.ts`), the front end inserts a row into `listings`
   (defaults to `ai_status = 'processing'`) with those fields, uploads the photo to the
   `listing-photos` bucket, and PATCHes the row with the resulting `photo_url`.
3. It then POSTs `{ item_id, photo_url, name, seller_condition, missing_items,
   seller_notes }` to the n8n webhook, with an `x-webhook-secret` header, and returns to
   the feed.
4. n8n responds immediately (see the workflow's "Respond to Webhook" node) and does
   the identify → research → value → draft work asynchronously, writing results back
   to the same `listings` row via the Supabase REST API.
5. Because the front end subscribes to Supabase Realtime on `listings`, the moment n8n
   sets `ai_status = 'complete'` (or `'failed'`), the UI updates with no polling needed.

See [`n8n/resell-ledger-ai-workflow.json`](n8n/resell-ledger-ai-workflow.json) for the
full pipeline (vision ID → Brave Search research → eBay API valuation → AI-written
eBay + Facebook Marketplace drafts) and its per-node notes for exactly what each step
does and which env vars it needs.

## Notes

- RLS on `listings` and the `listing-photos` bucket is currently wide open (see
  `supabase-setup.sql`) since this is a single-user tool on your own network.
  Tighten it if you ever expose this beyond your LAN/VPN. The same applies to
  `NEXT_PUBLIC_N8N_WEBHOOK_SECRET`, which is visible in the browser bundle — it's a
  basic filter against stray requests, not real authentication.
- Photos are stored in the public `listing-photos` Supabase Storage bucket so the
  feed can render thumbnails directly via their public URL.
- If a listing's `ai_status` ends up `'failed'`, the item detail page shows
  `error_step` and `error_message` (written by n8n's error handler) instead of the
  price/draft sections. There's currently no in-app retry button — re-fire the
  webhook manually (or from n8n) with the same `item_id`/`photo_url` once the
  underlying issue (bad API key, rate limit, etc.) is fixed.
