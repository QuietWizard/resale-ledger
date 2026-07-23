"use client";

import { useRef } from "react";

interface CaptureBarProps {
  onFileSelected: (file: File) => void;
}

export default function CaptureBar({ onFileSelected }: CaptureBarProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      e.target.value = ""; // allow re-selecting the same file later
    }
  }

  return (
    <div className="flex gap-2.5">
      <button
        onClick={() => cameraInputRef.current?.click()}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ledger px-3.5 py-3 font-body text-sm font-semibold text-paper-card shadow-card transition-transform active:scale-[0.97]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 flex-shrink-0">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        Take Photo
      </button>
      <button
        onClick={() => uploadInputRef.current?.click()}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg border-[1.5px] border-ledger px-3.5 py-3 font-body text-sm font-semibold text-ledger transition-transform active:scale-[0.97]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 flex-shrink-0">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
