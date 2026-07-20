export type ItemStatus = "processing" | "ready" | "archived";

export interface Item {
  id: string;
  created_at: string;
  photo_url: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  condition_notes: string | null;
  original_price: string | null;
  price_low: number | null;
  price_high: number | null;
  suggested_price: number | null;
  research_summary: string | null;
  ebay_title: string | null;
  ebay_description: string | null;
  fb_description: string | null;
  status: ItemStatus;
  archived_at: string | null;
}
