"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase, LISTINGS_TABLE } from "@/lib/supabase";
import type { Listing } from "@/lib/types";
import { formatCurrency, stripHtml } from "@/lib/format";

type Platform = "ebay" | "fb";

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [listing, setListing] = useState<Listing | null>(null);
  const [platform, setPlatform] = useState<Platform>("ebay");
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-paper pb-10">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Link href="/" className="font-mono text-[13px] text-ledger">
          ← Feed
        </Link>
      </div>

      <div className="px-5 py-5">
        {listing.photo_url && (
          <div className="relative mb-4 h-56 w-full overflow-hidden rounded-xl border border-line bg-paper-card">
            <Image src={listing.photo_url} alt={title} fill className="object-cover" />
          </div>
        )}

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

            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-ledger-dark">
                {formatCurrency(listing.recommended_price)}
              </span>
              {listing.price_range_low != null && listing.price_range_high != null && (
                <span className="font-mono text-xs text-brass">
                  range {formatCurrency(listing.price_range_low)}–
                  {formatCurrency(listing.price_range_high)}
                </span>
              )}
            </div>

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
      </div>
    </div>
  );
}
