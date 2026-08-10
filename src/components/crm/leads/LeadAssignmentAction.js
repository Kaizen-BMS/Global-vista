"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export function TakeLeadButton({ leadId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/claim`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "This lead has already been assigned.");
      toast.success("Lead claimed.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <button
      onClick={claim}
      disabled={busy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 cursor-pointer transition disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />} Take Lead
    </button>
  );
}

export function ReleaseLeadButton({ leadId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function release() {
    if (!confirm("Release this lead back to the unassigned pool?")) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/release`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to release lead.");
      toast.success("Lead released.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <button
      onClick={release}
      disabled={busy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer transition disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />} Release Lead
    </button>
  );
}
