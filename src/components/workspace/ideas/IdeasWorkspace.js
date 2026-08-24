"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, X, Loader2, Lightbulb, ClipboardList, Rocket, Timer, CheckCircle2, Globe2, Lock } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import EmptyState from "@/components/shared/EmptyState";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const STATUS_ACCENT = {
  Submitted: "border-sky-500/30 bg-sky-500/5 text-sky-400",
  "Under Review": "border-amber-500/30 bg-amber-500/5 text-amber-400",
  Planned: "border-violet-500/30 bg-violet-500/5 text-violet-400",
  "In Progress": "border-indigo-500/30 bg-indigo-500/5 text-indigo-400",
  Implemented: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  Rejected: "border-border bg-muted text-muted-foreground",
};
const STATUS_TABS = ["All", "Submitted", "Under Review", "Planned", "In Progress", "Implemented", "Rejected"];

function StatTile({ label, value, icon: Icon, accent, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-xs mb-1">{label}</p>
        <p className="text-foreground text-xl font-semibold tabular-nums">{value}</p>
      </div>
      <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${accent}`}><Icon className="h-4.5 w-4.5" /></div>
    </motion.div>
  );
}

function NewIdeaModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", category: categories[0] || "Other", priority: "Medium", description: "", visibility: "private" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) { toast.error("Title and description are required."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("file", file);
      const res = await apiFetch("/api/ideas", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Idea submitted.");
      onCreated();
    } catch (err) { toast.error(err.message || "Failed to submit idea."); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <ModalFocusTrap>
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Share an Idea" className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">Share an Idea</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <label className="block text-xs text-muted-foreground mb-1.5">Title</label>
        <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-4" placeholder="What's your idea?" />

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
              {["Low", "Medium", "High"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
        <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-4" placeholder="Explain your idea and the impact it could have" />

        <label className="block text-xs text-muted-foreground mb-1.5">Visibility</label>
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => setForm({ ...form, visibility: "private" })} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition ${form.visibility === "private" ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400" : "border-border text-muted-foreground"}`}>
            <Lock className="h-3.5 w-3.5" /> Just me & evaluators
          </button>
          <button type="button" onClick={() => setForm({ ...form, visibility: "company" })} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition ${form.visibility === "company" ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400" : "border-border text-muted-foreground"}`}>
            <Globe2 className="h-3.5 w-3.5" /> Visible to company
          </button>
        </div>

        <label className="block text-xs text-muted-foreground mb-1.5">Attachment (optional)</label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs text-muted-foreground mb-5 cursor-pointer" />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit
          </button>
        </div>
      </form>
      </ModalFocusTrap>
    </div>
  );
}

export default function IdeasWorkspace({ initialIdeas, initialStats, isSuperAdmin, categories }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [tab, setTab] = useState("All");
  const [creating, setCreating] = useState(false);

  async function reload() {
    const res = await apiFetch("/api/ideas?scope=company");
    if (res.ok) setIdeas((await res.json()).ideas);
    refreshSidebarBadges();
    router.refresh();
  }

  const filtered = tab === "All" ? ideas : ideas.filter((i) => i.status === tab);

  return (
    <div className="space-y-6">
      {isSuperAdmin && initialStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile label="Total" value={initialStats.total} icon={Lightbulb} accent="text-indigo-400 bg-indigo-500/10" delay={0} />
          <StatTile label="Submitted" value={initialStats.submitted} icon={ClipboardList} accent="text-sky-400 bg-sky-500/10" delay={0.03} />
          <StatTile label="Under Review" value={initialStats.underReview} icon={Timer} accent="text-amber-400 bg-amber-500/10" delay={0.06} />
          <StatTile label="Planned" value={initialStats.planned} icon={ClipboardList} accent="text-violet-400 bg-violet-500/10" delay={0.09} />
          <StatTile label="In Progress" value={initialStats.inProgress} icon={Rocket} accent="text-indigo-400 bg-indigo-500/10" delay={0.12} />
          <StatTile label="Implemented" value={initialStats.implemented} icon={CheckCircle2} accent="text-emerald-400 bg-emerald-500/10" delay={0.15} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition ${tab === s ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" : "text-muted-foreground border border-transparent hover:bg-muted"}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="btn-brand flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-sm font-medium cursor-pointer shrink-0">
          <Plus className="h-4 w-4" /> Share Idea
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No ideas here" description={tab === "All" ? "Nothing has been submitted yet." : `No ideas with status "${tab}".`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((i) => (
            <Link key={i.id} href={`/workspace/ideas/${i.id}`} className={`rounded-xl border p-4 transition hover:-translate-y-0.5 cursor-pointer block ${STATUS_ACCENT[i.status] || "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-foreground text-sm font-medium truncate">{i.title}</p>
                {i.visibility === "company" && <Globe2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </div>
              {isSuperAdmin && <p className="text-muted-foreground text-xs mb-1">By {i.created_by_name || "—"}</p>}
              <p className="text-muted-foreground text-xs mb-3">#{i.id} · {i.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">{i.status}</span>
                <span className="text-muted-foreground text-[11px]">{formatDateTime(i.created_at, timezone)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <NewIdeaModal categories={categories} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />}
    </div>
  );
}
