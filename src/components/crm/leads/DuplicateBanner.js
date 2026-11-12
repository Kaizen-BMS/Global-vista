"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function DuplicateBanner({ leadId, duplicateOfId, duplicateOfName, duplicateOfNumber, canMerge }) {
  const router = useRouter();
  const [merging, setMerging] = useState(false);

  async function handleMerge() {
    if (!confirm(`Merge this lead into "${duplicateOfName}"? Its notes, tasks, follow-ups, and documents will move to the original, and this lead will be marked as a duplicate.`)) return;
    setMerging(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/merge`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: duplicateOfId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Merged.");
      router.push(`/workspace/lead-management/${duplicateOfId}`);
    } catch { toast.error("Merge failed."); } finally { setMerging(false); }
  }

  return (
    // text-amber-300 read fine on a dark background but nearly vanished
    // against this banner's own light tint in light mode (confirmed
    // live) — text-amber-700 dark:text-amber-300 keeps good contrast in
    // both themes, same convention already used elsewhere in the app
    // (e.g. PlatformHome.js's "gold" accent).
    <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Possible duplicate of{" "}
          <a href={`/workspace/lead-management/${duplicateOfId}`} className="underline font-medium hover:text-amber-800 dark:hover:text-amber-200">
            {duplicateOfName} ({duplicateOfNumber})
          </a>
        </span>
      </div>
      {canMerge && (
        <button onClick={handleMerge} disabled={merging} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-medium transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shrink-0">
          {merging && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Merge into original
        </button>
      )}
    </div>
  );
}
