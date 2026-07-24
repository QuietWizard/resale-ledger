"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase, LISTINGS_TABLE } from "@/lib/supabase";
import type { Listing } from "@/lib/types";
import { formatCurrency, stripHtml } from "@/lib/format";
import { deleteListing, reprocessListing } from "@/lib/capture";

type Platform = "ebay" | "fb";
const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"] as const;

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [platform, setPlatform] = useState<Platform>("ebay");
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCondition, setEditCondition] = useState("");
  const [editMissingItems, setEditMissingItems] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState("");
  const [editComparableUrl, setEditComparableUrl] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadListing() {
      const { data, error } = await supabase
        .from(LISTINGS_TABLE)
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        console.error("Failed to load listing:", error.message);
      } else {
        setListing(data as Listing);
      }
    }
    loadListing();
  }, [id]);

  if (!listing) {
    return (
      <div className="mx-auto min-h-screen max-w-[480px] bg-paper px-5 py-10 text-center text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  const isFailed = listing.ai_status === "failed";
  const title = listing.identified_product_name ?? listing.name ?? "Untitled item";

  const draftText =
    platform === "ebay"
      ? [listing.ebay_title, listing.ebay_description ? stripHtml(listing.ebay_description) : null]
          .filter(Boolean)
          .join("\n\n")
      : [listing.fb_description, listing.fb_hashtags?.join(" ")].filter(Boolean).join("\n\n");

  async function copyDraft() {
    await navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function startEditing() {
    if (!listing) return;
    setEditName(listing.name ?? "");
    setEditCondition(listing.seller_condition ?? "");
    setEditMissingItems(listing.missing_items ?? "");
    setEditNotes(listing.seller_notes ?? "");
    setEditOriginalPrice(listing.seller_original_price != null ? String(listing.seller_original_price) : "");
    setEditComparableUrl(listing.seller_comparable_url ?? "");
    setRetryError(null);
    setEditing(true);
  }

  async function submitRetry(e: React.FormEvent) {
    e.preventDefault();
    if (!listing?.photo_url || retrying) return;

    setRetrying(true);
    setRetryError(null);
    try {
      await reprocessListing(listing.id, listing.photo_url, {
        name: editName,
        sellerCondition: editCondition,
        missingItems: editMissingItems,
        sellerNotes: editNotes,
        originalPrice: editOriginalPrice,
        comparableUrl: editComparableUrl,
      });
      router.push("/");
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Failed to retry listing");
      setRetrying(false);
    }
  }

  async function handleDelete() {
    if (!listing || deleting) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteListing(listing.id, listing.photo_url);
      router.push("/");
    } catch (err) {
      console.error("Failed to delete listing:", err);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-paper pb-10">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <Link href="/" className="font-mono text-[13px] text-ledger">
          ← Feed
        </Link>
        {!editing && (
          <div className="flex items-center gap-3">
            <button
              onClick={startEditing}
              className="font-mono text-[11px] uppercase tracking-wider text-ledger"
            >
              Edit &amp; Retry
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="font-mono text-[11px] uppercase tracking-wider text-stamp disabled:opacity-50"
            >
              {deleting ? "Deleting…" : confirmingDelete ? "Confirm?" : "Delete"}
            </button>
          </div>
        )}
      </div>

      <div className="px-5 py-5">
        {listing.photo_url && (
          <div className="relative mb-4 h-56 w-full overflow-hidden rounded-xl border border-line bg-paper-card">
            <Image src={listing.photo_url} alt={title} fill className="object-cover" />
          </div>
        )}

        {editing ? (
          <form onSubmit={submitRetry} className="flex flex-col gap-4">
            <p className="text-[13px] text-ink-soft">
              Correct any details below, then re-run the AI pipeline against the same photo.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Name <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. the exact product name, if you know it"
                className="rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Condition <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <select
                value={editCondition}
                onChange={(e) => setEditCondition(e.target.value)}
                className="rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ledger"
              >
                <option value="">Not sure / skip</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Original Price <span className="normal-case tracking-normal">(optional — if you know it)</span>
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={editOriginalPrice}
                onChange={(e) => setEditOriginalPrice(e.target.value)}
                placeholder="e.g. 150.00"
                className="rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Comparable Listing URL{" "}
                <span className="normal-case tracking-normal">(optional — a similar item you found)</span>
              </span>
              <input
                type="url"
                value={editComparableUrl}
                onChange={(e) => setEditComparableUrl(e.target.value)}
                placeholder="e.g. an eBay listing link"
                className="rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Missing Items <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                type="text"
                value={editMissingItems}
                onChange={(e) => setEditMissingItems(e.target.value)}
                placeholder="e.g. no remote, missing battery cover"
                className="rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Notes <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Anything else worth mentioning"
                rows={3}
                className="resize-none rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            {retryError && (
              <p className="rounded-lg border border-stamp bg-paper-card p-3 text-[13px] text-stamp">
                {retryError}
              </p>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-lg border border-line px-3.5 py-3 font-body text-sm font-semibold text-ink-soft active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={retrying}
                className="flex-[2] rounded-lg bg-ledger px-3.5 py-3 font-body text-sm font-semibold text-paper-card shadow-card active:scale-[0.97] disabled:opacity-60"
              >
                {retrying ? "Restarting…" : "Save & Retry"}
              </button>
            </div>
          </form>
        ) : (
          <>
        <h1 className="font-display text-[22px] font-semibold leading-tight">{title}</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          {[listing.brand, listing.model, listing.category].filter(Boolean).join(" · ")}
        </p>

        {isFailed ? (
          <div className="mt-4 rounded-lg border border-stamp bg-paper-card p-3.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-stamp">
              Processing failed{listing.error_step ? ` — ${listing.error_step}` : ""}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
              {listing.error_message ?? "An unknown error occurred while processing this item."}
            </p>
          </div>
        ) : (
          <>
            {listing.condition_description && (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                {listing.condition_description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-ledger-dark">
                {formatCurrency(listing.recommended_price)}
              </span>
              {listing.price_range_low != null && listing.price_range_high != null && (
                <span className="font-mono text-xs text-brass">
                  range {formatCurrency(listing.price_range_low)}–
                  {formatCurrency(listing.price_range_high)}
                </span>
              )}
              {listing.data_confidence && (
                <span
                  title={listing.data_confidence_reason ?? undefined}
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    listing.data_confidence === "high"
                      ? "border-ledger text-ledger-dark"
                      : listing.data_confidence === "medium"
                        ? "border-brass text-brass"
                        : "border-stamp text-stamp"
                  }`}
                >
                  {listing.data_confidence} confidence
                </span>
              )}
            </div>
            {listing.data_confidence_reason && (
              <p className="mt-1 text-[11.5px] italic leading-relaxed text-ink-soft">
                {listing.data_confidence_reason}
              </p>
            )}

            <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-ink-soft">
              {listing.original_retail_price != null && (
                <span>Retail (new): {formatCurrency(listing.original_retail_price)}</span>
              )}
              {listing.market_value != null && (
                <span>Used market: {formatCurrency(listing.market_value)}</span>
              )}
              {listing.price_sell_fast != null && (
                <span>Sell fast: {formatCurrency(listing.price_sell_fast)}</span>
              )}
              {listing.price_maximize_profit != null && (
                <span>Max profit: {formatCurrency(listing.price_maximize_profit)}</span>
              )}
            </div>

            {listing.pricing_rationale && (
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                {listing.pricing_rationale}
              </p>
            )}

            {listing.comparables && listing.comparables.length > 0 && (
              <div className="mt-3.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ledger">Comparables</p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {listing.comparables.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-line bg-paper-card p-2.5 text-[12px] leading-snug"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink underline decoration-line underline-offset-2"
                          >
                            {c.title ?? "Comparable listing"}
                          </a>
                        ) : (
                          <span className="text-ink">{c.title ?? "Comparable listing"}</span>
                        )}
                        {c.price_usd != null && (
                          <span className="shrink-0 font-mono text-ledger-dark">
                            {formatCurrency(c.price_usd)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                        {c.match_type && (
                          <span className="rounded border border-line px-1.5 py-0.5">
                            {c.match_type.replace("_", " ")}
                          </span>
                        )}
                        {c.platform && <span>{c.platform}</span>}
                      </div>
                      {c.note && <p className="mt-1 text-ink-soft">{c.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {listing.key_features && listing.key_features.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {listing.key_features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] text-ink-soft"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            )}

            {listing.whats_included && listing.whats_included.length > 0 && (
              <div className="mt-3.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ledger">
                  What&apos;s Included
                </p>
                <ul className="mt-1 list-inside list-disc text-[12.5px] leading-relaxed text-ink-soft">
                  {listing.whats_included.map((thing) => (
                    <li key={thing}>{thing}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex gap-1.5">
              {(["ebay", "fb"] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex-1 rounded-[7px] border border-line py-2 font-mono text-[11px] uppercase tracking-wide ${
                    platform === p ? "bg-ledger text-paper-card" : "bg-paper text-ink"
                  }`}
                >
                  {p === "ebay" ? "eBay Draft" : "FB Marketplace Draft"}
                </button>
              ))}
            </div>

            {platform === "ebay" ? (
              <div className="mt-3.5 rounded-lg border border-line bg-paper-card p-3.5">
                <p className="font-display text-[15px] font-semibold leading-snug">
                  {listing.ebay_title ?? "No draft yet."}
                </p>
                {listing.ebay_subtitle && (
                  <p className="mt-0.5 text-[12px] text-ink-soft">{listing.ebay_subtitle}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-brass">
                  {listing.ebay_condition_tier && (
                    <span className="rounded border border-line px-1.5 py-0.5 text-ink-soft">
                      {listing.ebay_condition_tier}
                    </span>
                  )}
                  {listing.ebay_buy_it_now_price != null && (
                    <span>BIN {formatCurrency(listing.ebay_buy_it_now_price)}</span>
                  )}
                  {listing.ebay_auction_start_price != null && (
                    <span>Start {formatCurrency(listing.ebay_auction_start_price)}</span>
                  )}
                </div>
                {listing.ebay_description && (
                  <div
                    className="prose-ebay mt-3 text-[13px] leading-relaxed text-ink"
                    dangerouslySetInnerHTML={{ __html: listing.ebay_description }}
                  />
                )}
                {listing.ebay_item_specifics &&
                  Object.keys(listing.ebay_item_specifics).length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-dashed border-line pt-3 font-mono text-[11px]">
                      {Object.entries(listing.ebay_item_specifics).map(([key, value]) => (
                        <div key={key} className="contents">
                          <dt className="text-ink-soft">{key}</dt>
                          <dd className="text-ink">{value || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
              </div>
            ) : (
              <div className="mt-3.5 rounded-lg border border-line bg-paper-card p-3.5">
                <p className="font-display text-[15px] font-semibold leading-snug">
                  {listing.fb_title ?? "No draft yet."}
                </p>
                {listing.fb_price != null && (
                  <p className="mt-0.5 font-mono text-[13px] text-ledger-dark">
                    {formatCurrency(listing.fb_price)}
                  </p>
                )}
                <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">
                  {listing.fb_description ?? "No draft yet."}
                </p>
                {listing.fb_hashtags && listing.fb_hashtags.length > 0 && (
                  <p className="mt-2 font-mono text-[11px] text-ledger">
                    {listing.fb_hashtags.join(" ")}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={copyDraft}
              className="mt-3 w-full rounded-lg bg-ledger py-3 text-sm font-semibold text-paper-card"
            >
              {copied ? "Copied ✓" : "Copy Draft"}
            </button>
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
}
