"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CaptureBar from "@/components/CaptureBar";
import { createListing } from "@/lib/capture";

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"] as const;

export default function NewListingPage() {
  const router = useRouter();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sellerCondition, setSellerCondition] = useState("");
  const [missingItems, setMissingItems] = useState("");
  const [sellerNotes, setSellerNotes] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function handleFileSelected(file: File) {
    setError(null);
    setPhotoFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createListing(photoFile, { name, sellerCondition, missingItems, sellerNotes, originalPrice });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-paper pb-10">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Link href="/" className="font-mono text-[13px] text-ledger">
          ← Cancel
        </Link>
      </div>

      <div className="px-5 py-5">
        <h1 className="font-display text-[22px] font-semibold leading-tight">New Listing</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Snap or upload a photo, then tell us a bit about it — the more you share, the
          better the AI can price and describe it.
        </p>

        {!photoFile ? (
          <div className="mt-5">
            <CaptureBar onFileSelected={handleFileSelected} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <div className="relative h-56 w-full overflow-hidden rounded-xl border border-line bg-paper-card">
                {photoPreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote asset
                  <img
                    src={photoPreviewUrl}
                    alt="Selected item"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => setPhotoFile(null)}
                className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ledger"
              >
                Change Photo
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Name <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sony PS4 Pro, old radio, game thing…"
                className="rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Condition <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <select
                value={sellerCondition}
                onChange={(e) => setSellerCondition(e.target.value)}
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
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="e.g. 150.00"
                className="rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Missing Items <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                type="text"
                value={missingItems}
                onChange={(e) => setMissingItems(e.target.value)}
                placeholder="e.g. no remote, missing battery cover"
                className="rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                Notes <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <textarea
                value={sellerNotes}
                onChange={(e) => setSellerNotes(e.target.value)}
                placeholder="Anything else worth mentioning — scratches, why you're selling, etc."
                rows={3}
                className="resize-none rounded-lg border border-line bg-paper-card px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ledger"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-stamp bg-paper-card p-3 text-[13px] text-stamp">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full rounded-lg bg-ledger py-3 text-sm font-semibold text-paper-card disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create Listing"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
