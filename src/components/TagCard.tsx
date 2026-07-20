"use client";

import Image from "next/image";
import Link from "next/link";
import type { Item } from "@/lib/types";

interface TagCardProps {
  item: Item;
  onArchiveToggle: (item: Item) => void;
}

export default function TagCard({ item, onArchiveToggle }: TagCardProps) {
  const isProcessing = item.status === "processing";
  const isArchived = item.status === "archived";

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

      <div className="flex gap-3 py-3.5 pl-[34px] pr-4">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-line bg-paper">
          {item.photo_url && (
            <Image src={item.photo_url} alt="" fill sizes="64px" className="object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 truncate font-display text-[16.5px] font-semibold leading-tight">
            {item.name}
          </p>

          {isProcessing ? (
            <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-ledger">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="ml-1">Researching value &amp; drafting listings…</span>
            </div>
          ) : (
            <>
              <p className="mb-2 truncate text-xs text-ink-soft">
                {item.condition_notes}
                {item.original_price ? ` · ${item.original_price}` : ""}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[17px] font-bold text-ledger-dark">
                  ${item.suggested_price}
                </span>
                {item.price_low != null && item.price_high != null && (
                  <span className="font-mono text-[11px] text-brass">
                    range {item.price_low}–{item.price_high}
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
            href={`/item/${item.id}`}
            className="flex-1 border-r border-line px-2 py-[11px] text-center font-body text-[12.5px] font-semibold active:bg-paper"
          >
            View Drafts
          </Link>
          <button
            onClick={() => onArchiveToggle(item)}
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
