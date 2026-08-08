"use client";
import { Sparkles } from "lucide-react";

/** Placeholder for a future AI-assisted search — intentionally disabled, not wired to any backend. */
export default function AiSearchButton() {
  return (
    <button
      type="button"
      disabled
      title="AI Search — coming soon"
      aria-label="AI Search — coming soon"
      className="hidden sm:flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground/50 cursor-not-allowed"
    >
      <Sparkles className="h-4 w-4" />
    </button>
  );
}
