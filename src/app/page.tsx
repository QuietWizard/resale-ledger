"use client";

import { useEffect, useState } from "react";
import CaptureBar from "@/components/CaptureBar";
import TagCard from "@/components/TagCard";
import { supabase, ITEM_PHOTOS_BUCKET, N8N_CAPTURE_WEBHOOK_URL } from "@/lib/supabase";
import type { Item } from "@/lib/types";

type Tab = "feed" | "archived";

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Tab>("feed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load items:", error.message);
      } else if (isMounted && data) {
        setItems(data as Item[]);
      }
      setLoading(false);
    }

    loadItems();

    // Live updates: as soon as n8n finishes writing back a result, the feed reflects it
    // without a manual refresh.
    const channel = supabase
      .channel("items-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        (payload) => {
          setItems((current) => {
            if (payload.eventType === "INSERT") {
              return [payload.new as Item, ...current];
            }
            if (payload.eventType === "UPDATE") {
              return current.map((i) => (i.id === (payload.new as Item).id ? (payload.new as Item) : i));
            }
            if (payload.eventType === "DELETE") {
              return current.filter((i) => i.id !== (payload.old as Item).id);
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

  async function handleFilesSelected(files: FileList) {
    for (const file of Array.from(files)) {
      await captureItem(file);
    }
  }

  async function captureItem(file: File) {
    // 1. Insert a placeholder row immediately so the user sees feedback right away.
    const { data: inserted, error: insertError } = await supabase
      .from("items")
      .insert({ name: "New item", status: "processing" })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Failed to create item:", insertError?.message);
      return;
    }

    // 2. Upload the photo to Supabase Storage, keyed by the new item's id.
    const filePath = `${inserted.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(ITEM_PHOTOS_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Failed to upload photo:", uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(ITEM_PHOTOS_BUCKET).getPublicUrl(filePath);

    await supabase.from("items").update({ photo_url: publicUrl }).eq("id", inserted.id);

    // 3. Kick off the n8n pipeline: identify → research → draft. n8n writes the
    // results back to this same row (see the n8n workflow README).
    try {
      await fetch(N8N_CAPTURE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: inserted.id, photo_url: publicUrl }),
      });
    } catch (err) {
      console.error("Failed to reach n8n webhook:", err);
    }
  }

  async function handleArchiveToggle(item: Item) {
    const nextStatus = item.status === "archived" ? "ready" : "archived";
    await supabase
      .from("items")
      .update({
        status: nextStatus,
        archived_at: nextStatus === "archived" ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
  }

  const visibleItems = items.filter((i) =>
    tab === "archived" ? i.status === "archived" : i.status !== "archived"
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

      <CaptureBar onFilesSelected={handleFilesSelected} />

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
        ) : visibleItems.length === 0 ? (
          <div className="px-5 py-16 text-center text-ink-soft">
            <p className="text-sm leading-relaxed">
              {tab === "archived"
                ? "Nothing archived yet — sold items will land here."
                : "No items in the feed yet. Take a photo of something to get started."}
            </p>
          </div>
        ) : (
          visibleItems.map((item) => (
            <TagCard key={item.id} item={item} onArchiveToggle={handleArchiveToggle} />
          ))
        )}
      </div>
    </div>
  );
}
