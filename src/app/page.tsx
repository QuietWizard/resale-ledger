"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TagCard from "@/components/TagCard";
import { supabase, LISTINGS_TABLE } from "@/lib/supabase";
import type { Listing } from "@/lib/types";

type Tab = "feed" | "archived";

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [tab, setTab] = useState<Tab>("feed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      const { data, error } = await supabase
        .from(LISTINGS_TABLE)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load listings:", error.message);
      } else if (isMounted && data) {
        setListings(data as Listing[]);
      }
      setLoading(false);
    }

    loadListings();

    // Live updates: as soon as n8n finishes writing back a result, the feed reflects it
    // without a manual refresh.
    const channel = supabase
      .channel("listings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: LISTINGS_TABLE },
        (payload) => {
          setListings((current) => {
            if (payload.eventType === "INSERT") {
              return [payload.new as Listing, ...current];
            }
            if (payload.eventType === "UPDATE") {
              return current.map((i) =>
                i.id === (payload.new as Listing).id ? (payload.new as Listing) : i
              );
            }
            if (payload.eventType === "DELETE") {
              return current.filter((i) => i.id !== (payload.old as Listing).id);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleArchiveToggle(listing: Listing) {
    const isArchived = listing.archived_at != null;
    await supabase
      .from(LISTINGS_TABLE)
      .update({ archived_at: isArchived ? null : new Date().toISOString() })
      .eq("id", listing.id);
  }

  const visibleListings = listings.filter((l) =>
    tab === "archived" ? l.archived_at != null : l.archived_at == null
  );

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-paper pb-10">
      <header className="border-b border-line px-5 pb-[18px] pt-7">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ledger">
          Household Resale Ledger
        </p>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
          Snap it. Tag it. Sell it.
        </h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Photograph an item — get a priced, ready-to-post listing back.
        </p>
      </header>

      <div className="sticky top-0 z-10 border-b border-line bg-paper px-5 py-4">
        <Link
          href="/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-ledger px-3.5 py-3 font-body text-sm font-semibold text-paper-card shadow-card transition-transform active:scale-[0.97]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 flex-shrink-0">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Listing
        </Link>
      </div>

      <div className="flex gap-1 px-5 pt-3.5">
        {(["feed", "archived"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-2 font-mono text-[11.5px] uppercase tracking-wider ${
              tab === t
                ? "border border-line bg-paper-card font-semibold text-ink"
                : "border border-transparent text-ink-soft"
            }`}
          >
            {t === "feed" ? "Feed" : "Archived"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 px-5 pb-5 pt-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-ink-soft">Loading…</p>
        ) : visibleListings.length === 0 ? (
          <div className="px-5 py-16 text-center text-ink-soft">
            <p className="text-sm leading-relaxed">
              {tab === "archived"
                ? "Nothing archived yet — sold items will land here."
                : "No items in the feed yet. Tap New Listing to get started."}
            </p>
          </div>
        ) : (
          visibleListings.map((listing) => (
            <TagCard key={listing.id} listing={listing} onArchiveToggle={handleArchiveToggle} />
          ))
        )}
      </div>
    </div>
  );
}
