"use client";

import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface TagCardProps {
  listing: Listing;
  onArchiveToggle: (listing: Listing) => void;
}

export default function TagCard({ listing, onArchiveToggle }: TagCardProps) {
  const isProcessing = listing.ai_status === "processing";
  const isFailed = listing.ai_status === "failed";
  const isArchived = listing.archived_at != null;

  const title = listing.identified_product_name ?? listing.name ?? "New item";
  const conditionLine = listing.ebay_condition_tier ?? listing.seller_condition;

  return (
    <div
      className={`tag-card overflow-hidden rounded-[10px] border border-line bg-paper-card shadow-card transition-opacity ${
        isProcessing ? "opacity-70" : isArchived ? "opacity-55" : ""
      }`}
    >
      {isArchived && (
        <span className="stamp rounded border-2 border-stamp px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-stamp">
          Archived
        </span>
      )}
      {!isArchived && isFailed && (
        <span className="stamp rounded border-2 border-stamp px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-stamp">
          Failed
        </span>
      )}

      <div className="flex gap-3 py-3.5 pl-[34px] pr-4">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-line bg-paper">
          {listing.photo_url && (
            <Image src={listing.photo_url} alt="" fill sizes="64px" className="object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 truncate font-display text-[16.5px] font-semibold leading-tight">
            {title}
          </p>

          {isProcessing ? (
            <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-ledger">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="ml-1">Researching value &amp; drafting listings…</span>
            </div>
          ) : isFailed ? (
            <p className="mt-1 truncate text-xs text-stamp">
              {listing.error_message ?? "Something went wrong during processing."}
            </p>
          ) : (
            <>
              <p className="mb-2 truncate text-xs text-ink-soft">
                {conditionLine}
                {listing.original_retail_price != null
                  ? ` · ${formatCurrency(listing.original_retail_price)} new`
                  : ""}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[17px] font-bold text-ledger-dark">
                  {formatCurrency(listing.recommended_price)}
                </span>
                {listing.price_range_low != null && listing.price_range_high != null && (
                  <span className="font-mono text-[11px] text-brass">
                    range {formatCurrency(listing.price_range_low)}–
                    {formatCurrency(listing.price_range_high)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!isProcessing && (
        <div className="flex border-t border-line">
          <Link
            href={`/item/${listing.id}`}
            className="flex-1 border-r border-line px-2 py-[11px] text-center font-body text-[12.5px] font-semibold active:bg-paper"
          >
            {isFailed ? "View Details" : "View Drafts"}
          </Link>
          <button
            onClick={() => onArchiveToggle(listing)}
            className={`flex-1 px-2 py-[11px] font-body text-[12.5px] font-semibold active:bg-paper ${
              isArchived ? "text-ink" : "text-stamp"
            }`}
          >
            {isArchived ? "Restore" : "Archive"}
          </button>
        </div>
      )}
    </div>
  );
}
