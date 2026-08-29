"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Loader2, LifeBuoy } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";
import EmptyState from "@/components/shared/EmptyState";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

const STATUS_ACCENT = {
  "Open": "border-sky-500/30 bg-sky-500/5 text-sky-400",
  "In Progress": "border-indigo-500/30 bg-indigo-500/5 text-indigo-400",
  "Waiting for Company": "border-violet-500/30 bg-violet-500/5 text-violet-400",
  "Resolved": "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  "Closed": "border-border bg-muted text-muted-foreground",
};
const PRIORITY_ACCENT = { Low: "text-muted-foreground", Medium: "text-sky-400", High: "text-amber-400", Urgent: "text-red-400" };

function NewTicketModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({ subject: "", category: categories[0] || "Other", priority: "Medium", description: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) { toast.error("Subject and description are required."); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/support-tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Ticket sent to the platform team.");
      onCreated();
    } catch (err) { toast.error(err.message || "Failed to submit ticket."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <ModalFocusTrap>
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Contact Platform Support" className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">Contact Platform Support</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-muted-foreground text-xs mb-4">This goes directly to the KaizenBMS platform team, not your own company's admins.</p>

        <label className="block text-xs text-muted-foreground mb-1.5">Subject</label>
        <input autoFocus value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-4" placeholder="Brief summary" />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
              {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
        <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-5" placeholder="What do you need help with?" />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Send
          </button>
        </div>
      </form>
      </ModalFocusTrap>
    </div>
  );
}

export default function PlatformSupportWorkspace({ initialTickets, categories, canManage }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [tickets, setTickets] = useState(initialTickets);
  const [creating, setCreating] = useState(false);

  async function reload() {
    const res = await apiFetch("/api/support-tickets");
    if (res.ok) setTickets((await res.json()).tickets);
    router.refresh();
  }

  if (!canManage) {
    return (
      <EmptyState icon={LifeBuoy} title="Only a Super Admin can contact platform support" description="Ask your company's Super Admin to raise this with the KaizenBMS platform team." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-muted-foreground text-sm max-w-lg">Raise this directly with the KaizenBMS platform team — for billing questions, technical issues, or anything your own company's Complaints section can't resolve.</p>
        <button onClick={() => setCreating(true)} className="btn-brand flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-sm font-medium cursor-pointer shrink-0">
          <Plus className="h-4 w-4" /> Contact Platform Support
        </button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No tickets yet" description="Nothing has been sent to the platform team yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/workspace/platform-support/${t.id}`} className={`rounded-xl border p-4 transition hover:-translate-y-0.5 cursor-pointer block ${STATUS_ACCENT[t.status] || "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-foreground text-sm font-medium truncate">{t.subject}</p>
                <span className={`text-[10px] font-semibold shrink-0 ${PRIORITY_ACCENT[t.priority]}`}>{t.priority}</span>
              </div>
              <p className="text-muted-foreground text-xs mb-3">#{t.id} · {t.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">{t.status}</span>
                <span className="text-muted-foreground text-[11px]">{formatDateTime(t.created_at, timezone)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <NewTicketModal categories={categories} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />}
    </div>
  );
}
