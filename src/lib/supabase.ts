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

export const ITEM_PHOTOS_BUCKET = "item-photos";
export const N8N_CAPTURE_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CAPTURE_WEBHOOK_URL!;
