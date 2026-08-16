"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, UserMinus, Loader2, Check } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

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
      refreshSidebarBadges();
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
      refreshSidebarBadges();
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

/** Reassign to a specific employee — used from the Lead Header's "More
 * actions" menu, only rendered there when the caller holds leads.assign. */
export function AssignToPicker({ leadId, employees, currentAssignedTo, onDone }) {
  const router = useRouter();
  const [value, setValue] = useState(currentAssignedTo ? String(currentAssignedTo) : "");
  const [busy, setBusy] = useState(false);

  async function assign() {
    if (!value) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignedTo: value }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to assign lead.");
      toast.success("Lead assigned.");
      router.refresh();
      refreshSidebarBadges();
      onDone?.();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-1.5 p-2">
      <select value={value} onChange={(e) => setValue(e.target.value)} className="flex-1 px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs cursor-pointer">
        <option value="">Select employee…</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <button onClick={assign} disabled={busy || !value} className="flex items-center justify-center h-7 w-7 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:opacity-50 shrink-0">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
