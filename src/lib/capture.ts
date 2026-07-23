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

// Fires the n8n pipeline for an existing (already-inserted) listing row. n8n flips
// ai_status to 'processing' itself as soon as it receives this, then writes results
// back to the same row (see n8n/resell-ledger-ai-workflow.json). Errors here don't
// throw — the row already exists either way, it just won't get picked up until the
// webhook is reachable again.
async function fireWebhook(
  itemId: string,
  photoUrl: string,
  fields: { name: string | null; sellerCondition: string | null; missingItems: string | null; sellerNotes: string | null }
) {
  try {
    await fetch(N8N_CAPTURE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        item_id: itemId,
        photo_url: photoUrl,
        name: fields.name,
        seller_condition: fields.sellerCondition,
        missing_items: fields.missingItems,
        seller_notes: fields.sellerNotes,
      }),
    });
  } catch (err) {
    console.error("Failed to reach n8n webhook:", err);
  }
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

  // 3. Kick off the n8n pipeline: identify → research → value → draft.
  await fireWebhook(inserted.id, publicUrl, { name, sellerCondition, missingItems, sellerNotes });

  return inserted.id;
}

// Re-runs the pipeline for an existing listing — same photo, optionally corrected
// seller-provided fields (e.g. fixing a misidentified name before retrying). Updates
// the row's seller fields first so they stay consistent with what gets sent to n8n,
// then fires the webhook again. Throws on failure to update the row.
export async function reprocessListing(
  id: string,
  photoUrl: string,
  fields: NewListingFields
): Promise<void> {
  const name = fields.name.trim() || null;
  const sellerCondition = fields.sellerCondition.trim() || null;
  const missingItems = fields.missingItems.trim() || null;
  const sellerNotes = fields.sellerNotes.trim() || null;

  const { error: updateError } = await supabase
    .from(LISTINGS_TABLE)
    .update({
      name,
      seller_condition: sellerCondition,
      missing_items: missingItems,
      seller_notes: sellerNotes,
    })
    .eq("id", id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await fireWebhook(id, photoUrl, { name, sellerCondition, missingItems, sellerNotes });
}

// Deletes a listing row and its uploaded photo. Throws on failure so the UI can
// surface it; the photo delete is best-effort (a failed photo delete shouldn't block
// removing the row from the feed).
export async function deleteListing(id: string, photoUrl: string | null): Promise<void> {
  const { error } = await supabase.from(LISTINGS_TABLE).delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  if (photoUrl) {
    const marker = `/${LISTING_PHOTOS_BUCKET}/`;
    const idx = photoUrl.indexOf(marker);
    if (idx !== -1) {
      const path = photoUrl.slice(idx + marker.length);
      const { error: storageError } = await supabase.storage.from(LISTING_PHOTOS_BUCKET).remove([path]);
      if (storageError) {
        console.error("Failed to delete listing photo:", storageError.message);
      }
    }
  }
}
