import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev rather than silently returning no data — fill these in .env.local
  console.warn(
    "Supabase env vars are missing. Copy .env.local.example to .env.local and fill in your project's URL and anon key."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const LISTINGS_TABLE = "listings";
export const LISTING_PHOTOS_BUCKET = "listing-photos";

// Fires the n8n identify/research/draft pipeline for a newly-captured listing.
export const N8N_CAPTURE_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CAPTURE_WEBHOOK_URL!;

// Sent as the x-webhook-secret header so the n8n workflow's "Verify Webhook Secret"
// node accepts the request. This is a NEXT_PUBLIC_ var (visible in the browser bundle),
// which is fine for a single-user tool on your own LAN/VPN per the README's security
// notes — it's not a substitute for real auth if you ever expose this beyond that.
export const N8N_WEBHOOK_SECRET = process.env.NEXT_PUBLIC_N8N_WEBHOOK_SECRET!;
