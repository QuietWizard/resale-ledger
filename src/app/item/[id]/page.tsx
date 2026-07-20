"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Item } from "@/lib/types";

type Platform = "ebay" | "fb";

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Item | null>(null);
  const [platform, setPlatform] = useState<Platform>("ebay");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadItem() {
      const { data, error } = await supabase.from("items").select("*").eq("id", id).single();
      if (error) {
        console.error("Failed to load item:", error.message);
      } else {
        setItem(data as Item);
      }
    }
    loadItem();
  }, [id]);

  if (!item) {
    return (
      <div className="mx-auto min-h-screen max-w-[480px] bg-paper px-5 py-10 text-center text-sm text-ink-soft">
        Loading…
      </div>
    );
  }

  const draftText =
    platform === "ebay"
      ? [item.ebay_title, item.ebay_description].filter(Boolean).join("\n\n")
      : item.fb_description ?? "";

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
        {item.photo_url && (
          <div className="relative mb-4 h-56 w-full overflow-hidden rounded-xl border border-line bg-paper-card">
            <Image src={item.photo_url} alt={item.name} fill className="object-cover" />
          </div>
        )}

        <h1 className="font-display text-[22px] font-semibold leading-tight">{item.name}</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          {item.condition_notes}
          {item.original_price ? ` · ${item.original_price}` : ""}
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-ledger-dark">
            ${item.suggested_price}
          </span>
          {item.price_low != null && item.price_high != null && (
            <span className="font-mono text-xs text-brass">
              range {item.price_low}–{item.price_high}
            </span>
          )}
        </div>

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

        <div className="mt-3.5 whitespace-pre-wrap rounded-lg border border-line bg-paper-card p-3.5 text-[13.5px] leading-relaxed">
          {draftText || "No draft yet."}
        </div>

        <button
          onClick={copyDraft}
          className="mt-3 w-full rounded-lg bg-ledger py-3 text-sm font-semibold text-paper-card"
        >
          {copied ? "Copied ✓" : "Copy Draft"}
        </button>

        {item.research_summary && (
          <p className="mt-3 border-t border-dashed border-line pt-3 text-[11.5px] leading-relaxed text-ink-soft">
            {item.research_summary}
          </p>
        )}
      </div>
    </div>
  );
}
