"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function DuplicateFormButton({ formId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/leads/forms/${formId}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to duplicate form.");
      toast.success("Query Form duplicated — the copy is saved as Inactive.");
      router.push(`/workspace/lead-forms/${data.id}/edit`);
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <button
      onClick={duplicate}
      disabled={busy}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm transition cursor-pointer disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Duplicate
    </button>
  );
}
