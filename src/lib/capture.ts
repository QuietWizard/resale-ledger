import {
  supabase,
  LISTINGS_TABLE,
  LISTING_PHOTOS_BUCKET,
  N8N_CAPTURE_WEBHOOK_URL,
  N8N_WEBHOOK_SECRET,
} from "./supabase";

export interface NewListingFields {
  name: string;
  sellerCondition: string;
  missingItems: string;
  sellerNotes: string;
}

// Creates a listing row, uploads its photo, and fires the n8n pipeline. Throws with a
// user-presentable message on failure so the New Listing form can surface it inline.
export async function createListing(file: File, fields: NewListingFields): Promise<string> {
  const name = fields.name.trim() || null;
  const sellerCondition = fields.sellerCondition.trim() || null;
  const missingItems = fields.missingItems.trim() || null;
  const sellerNotes = fields.sellerNotes.trim() || null;

  // 1. Insert the row first (ai_status defaults to 'processing') so the feed shows
  // feedback immediately, then attach the photo once it's uploaded.
  const { data: inserted, error: insertError } = await supabase
    .from(LISTINGS_TABLE)
    .insert({
      name,
      seller_condition: sellerCondition,
      missing_items: missingItems,
      seller_notes: sellerNotes,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Failed to create listing");
  }

  // 2. Upload the photo to Supabase Storage, keyed by the new listing's id.
  const filePath = `${inserted.id}/${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from(LISTINGS_TABLE)
    .update({ photo_url: publicUrl })
    .eq("id", inserted.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // 3. Kick off the n8n pipeline: identify → research → value → draft. n8n writes
  // the results back to this same row (see n8n/resell-ledger-ai-workflow.json).
  try {
    await fetch(N8N_CAPTURE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        item_id: inserted.id,
        photo_url: publicUrl,
        name,
        seller_condition: sellerCondition,
        missing_items: missingItems,
        seller_notes: sellerNotes,
      }),
    });
  } catch (err) {
    // The row and photo are already saved — surface this but don't block navigation.
    // n8n just won't pick it up until the webhook is reachable again.
    console.error("Failed to reach n8n webhook:", err);
  }

  return inserted.id;
}
