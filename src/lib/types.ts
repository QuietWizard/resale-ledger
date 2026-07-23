export type AiStatus = "processing" | "complete" | "failed";

export interface Dimensions {
  length: string | null;
  width: string | null;
  height: string | null;
  weight: string | null;
  unit: string | null;
}

export interface Listing {
  id: string;
  created_at: string;
  photo_url: string | null;

  name: string | null;
  seller_condition: string | null;
  missing_items: string | null;
  seller_notes: string | null;

  ai_status: AiStatus;
  error_message: string | null;
  error_step: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;

  identified_product_name: string | null;
  brand: string | null;
  model: string | null;
  model_number: string | null;
  category: string | null;
  subcategory: string | null;
  item_color: string | null;
  dimensions: Dimensions | null;
  key_features: string[] | null;
  condition_description: string | null;
  whats_included: string[] | null;

  original_retail_price: number | null;
  current_new_price: number | null;
  market_value: number | null;
  price_sell_fast: number | null;
  price_maximize_profit: number | null;
  recommended_price: number | null;
  price_range_low: number | null;
  price_range_high: number | null;
  pricing_rationale: string | null;
  best_platform: string | null;

  ebay_title: string | null;
  ebay_subtitle: string | null;
  ebay_condition_tier: string | null;
  ebay_condition_description: string | null;
  ebay_description: string | null;
  ebay_item_specifics: Record<string, string> | null;
  ebay_buy_it_now_price: number | null;
  ebay_auction_start_price: number | null;

  fb_title: string | null;
  fb_price: number | null;
  fb_description: string | null;
  fb_category: string | null;
  fb_hashtags: string[] | null;

  archived_at: string | null;
}
