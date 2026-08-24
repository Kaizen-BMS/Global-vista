"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, X, Loader2, MessageSquareWarning, Clock, AlertTriangle, CheckCircle2, Timer, Search } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";
import EmptyState from "@/components/shared/EmptyState";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

const STATUS_ACCENT = {
  "Open": "border-sky-500/30 bg-sky-500/5 text-sky-400",
  "Under Review": "border-amber-500/30 bg-amber-500/5 text-amber-400",
  "In Progress": "border-indigo-500/30 bg-indigo-500/5 text-indigo-400",
  "Waiting for Employee": "border-violet-500/30 bg-violet-500/5 text-violet-400",
  "Resolved": "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  "Closed": "border-border bg-muted text-muted-foreground",
};
const PRIORITY_ACCENT = {
  Low: "text-muted-foreground", Medium: "text-sky-400", High: "text-amber-400", Urgent: "text-red-400",
};
const STATUS_TABS = ["All", "Open", "Under Review", "In Progress", "Waiting for Employee", "Resolved", "Closed"];

function StatTile({ label, value, icon: Icon, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}
      className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
    >
      <div>
        <p className="text-muted-foreground text-xs mb-1">{label}</p>
        <p className="text-foreground text-xl font-semibold tabular-nums">{value}</p>
      </div>
      <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${accent}`}><Icon className="h-4.5 w-4.5" /></div>
    </motion.div>
  );
}

/** Optional "related lead" picker — degrades silently (hides itself) if the
 * caller doesn't hold leads.view, since raising a complaint must never
 * require a permission unrelated to complaints. */
function LeadPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!query.trim() || value) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/leads?search=${encodeURIComponent(query.trim())}&pageSize=5`);
        if (res.status === 403) { setUnavailable(true); return; }
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.leads || []);
        setOpen(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [query, value]);

  if (unavailable) return null;

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs text-muted-foreground mb-1.5">Related lead (optional)</label>
      {value ? (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted border border-border text-sm">
          <span className="text-foreground truncate">{value.name}</span>
          <button type="button" onClick={() => onChange(null)} aria-label="Clear related lead" className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or lead #" className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        </div>
      )}
      {open && !value && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-2xl max-h-40 overflow-y-auto">
          {results.map((l) => (
            <button key={l.id} type="button" onClick={() => { onChange({ id: l.id, name: l.name }); setOpen(false); setQuery(""); }} className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer flex items-center justify-between">
              <span className="truncate">{l.name}</span>
              <span className="text-muted-foreground text-[11px] shrink-0">{l.lead_number}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Employee picker sourced from the messaging directory — the one
 * low-privilege "list my colleagues" endpoint every employee can already
 * call (used for @-messaging), so this never requires users.view. */
function EmployeePicker({ value, onChange }) {
  const [employees, setEmployees] = useState(null);

  useEffect(() => {
    apiFetch("/api/messaging/users").then((res) => res.ok ? res.json() : { users: [] }).then((data) => setEmployees(data.users || [])).catch(() => setEmployees([]));
  }, []);

  if (employees === null || employees.length === 0) return null;

  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">Related employee (optional)</label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
        <option value="">None</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
    </div>
  );
}

function NewComplaintModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({ subject: "", category: categories[0] || "Other", priority: "Medium", description: "", desiredResolution: "" });
  const [relatedLead, setRelatedLead] = useState(null);
  const [relatedEmployeeId, setRelatedEmployeeId] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) { toast.error("Subject and description are required."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (relatedLead) fd.append("relatedLeadId", relatedLead.id);
      if (relatedEmployeeId) fd.append("relatedEmployeeId", relatedEmployeeId);
      if (file) fd.append("file", file);
      const res = await apiFetch("/api/complaints", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Complaint submitted.");
      onCreated();
    } catch (err) { toast.error(err.message || "Failed to submit complaint."); }
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
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Raise a Complaint" className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">Raise a Complaint</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

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
        <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-4" placeholder="What happened?" />

        <label className="block text-xs text-muted-foreground mb-1.5">Desired resolution (optional)</label>
        <input value={form.desiredResolution} onChange={(e) => setForm({ ...form, desiredResolution: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-4" placeholder="What would resolve this for you?" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <LeadPicker value={relatedLead} onChange={setRelatedLead} />
          <EmployeePicker value={relatedEmployeeId} onChange={setRelatedEmployeeId} />
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

export default function ComplaintsWorkspace({ initialComplaints, initialStats, isSuperAdmin, categories }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [complaints, setComplaints] = useState(initialComplaints);
  const [tab, setTab] = useState("All");
  const [creating, setCreating] = useState(false);

  async function reload() {
    const res = await apiFetch("/api/complaints");
    if (res.ok) setComplaints((await res.json()).complaints);
    refreshSidebarBadges();
    router.refresh();
  }

  const filtered = tab === "All" ? complaints : complaints.filter((c) => c.status === tab);

  return (
    <div className="space-y-6">
      {isSuperAdmin && initialStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile label="Total" value={initialStats.total} icon={MessageSquareWarning} accent="text-indigo-400 bg-indigo-500/10" delay={0} />
          <StatTile label="Open" value={initialStats.open} icon={Clock} accent="text-sky-400 bg-sky-500/10" delay={0.03} />
          <StatTile label="High Priority" value={initialStats.highPriority} icon={AlertTriangle} accent="text-amber-400 bg-amber-500/10" delay={0.06} />
          <StatTile label="In Progress" value={initialStats.inProgress} icon={Timer} accent="text-violet-400 bg-violet-500/10" delay={0.09} />
          <StatTile label="Resolved" value={initialStats.resolved} icon={CheckCircle2} accent="text-emerald-400 bg-emerald-500/10" delay={0.12} />
          <StatTile label="Overdue" value={initialStats.overdue} icon={AlertTriangle} accent={initialStats.overdue > 0 ? "text-red-400 bg-red-500/10" : "text-muted-foreground bg-muted-foreground/10"} delay={0.15} />
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
          <Plus className="h-4 w-4" /> Raise Complaint
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title="No complaints here" description={tab === "All" ? "Nothing has been raised yet." : `No complaints with status "${tab}".`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/workspace/complaints/${c.id}`} className={`rounded-xl border p-4 transition hover:-translate-y-0.5 cursor-pointer block ${STATUS_ACCENT[c.status] || "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-foreground text-sm font-medium truncate">{c.subject}</p>
                <span className={`text-[10px] font-semibold shrink-0 ${PRIORITY_ACCENT[c.priority]}`}>{c.priority}</span>
              </div>
              {isSuperAdmin && <p className="text-muted-foreground text-xs mb-1">By {c.created_by_name || "—"}</p>}
              <p className="text-muted-foreground text-xs mb-3">#{c.id} · {c.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">{c.status}</span>
                <span className="text-muted-foreground text-[11px]">{formatDateTime(c.created_at, timezone)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <NewComplaintModal categories={categories} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />}
    </div>
  );
}
