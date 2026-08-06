"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, MessageCircle, CheckCircle2, AlertTriangle, Clock, Star, CalendarCheck2, ChevronDown } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const SECTIONS = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, color: "text-red-400", accent: "border-red-500/30 bg-red-500/5" },
  { key: "today", label: "Today", icon: Clock, color: "text-indigo-400", accent: "border-indigo-500/30 bg-indigo-500/5" },
  { key: "upcoming", label: "Upcoming", icon: CalendarCheck2, color: "text-neutral-400", accent: "border-neutral-800 bg-neutral-900" },
  { key: "highPriority", label: "High Priority", icon: Star, color: "text-amber-400", accent: "border-amber-500/30 bg-amber-500/5" },
  { key: "completedToday", label: "Completed Today", icon: CheckCircle2, color: "text-emerald-400", accent: "border-emerald-500/30 bg-emerald-500/5" },
];

export default function FollowupDashboard({ data }) {
  const router = useRouter();
  const [completingId, setCompletingId] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [local, setLocal] = useState(data);

  async function complete(followup) {
    setCompletingId(followup.id);
    try {
      const res = await apiFetch(`/api/leads/${followup.lead_id}/followups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", followupId: followup.id, outcome: "Completed from dashboard" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Marked complete.");
      setLocal((prev) => {
        const next = { ...prev };
        for (const key of ["overdue", "today", "upcoming", "highPriority"]) next[key] = next[key].filter((f) => f.id !== followup.id);
        return next;
      });
      router.refresh();
    } catch { toast.error("Failed to complete."); } finally { setCompletingId(null); }
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const items = local[section.key] || [];
        const Icon = section.icon;
        const isCollapsed = collapsed[section.key];
        return (
          <div key={section.key}>
            <button onClick={() => setCollapsed((c) => ({ ...c, [section.key]: !c[section.key] }))} className="flex items-center gap-2 mb-3 cursor-pointer group w-full">
              <Icon className={`h-4 w-4 ${section.color}`} />
              <h2 className="text-sm font-semibold text-white">{section.label}</h2>
              <span className="text-neutral-600 text-xs">({items.length})</span>
              <ChevronDown className={`h-3.5 w-3.5 text-neutral-600 ml-auto transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
            </button>
            {!isCollapsed && (
              items.length === 0 ? (
                <p className="text-neutral-600 text-sm pb-2">Nothing here.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((f) => (
                    <div key={f.id} className={`rounded-xl border p-3.5 transition hover:-translate-y-0.5 ${section.accent}`}>
                      <div className="flex items-start justify-between mb-1.5">
                        <Link href={`/workspace/lead-management/${f.lead_id}`} className="text-white text-sm font-medium hover:text-indigo-400 cursor-pointer truncate">{f.lead_name}</Link>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-neutral-700 text-neutral-400 shrink-0">{f.priority}</span>
                      </div>
                      <p className="text-neutral-500 text-xs mb-2">{f.type} · {new Date(f.scheduled_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="text-neutral-600 text-xs mb-3">{f.assigned_name || "Unassigned"}</p>
                      <div className="flex items-center gap-1.5">
                        <a href={`tel:${f.lead_phone}`} className="p-1.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition"><Phone className="h-3.5 w-3.5" /></a>
                        <a href={`https://wa.me/${(f.lead_phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition"><MessageCircle className="h-3.5 w-3.5" /></a>
                        {section.key !== "completedToday" && (
                          <button onClick={() => complete(f)} disabled={completingId === f.id} className="ml-auto flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer transition disabled:opacity-50">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
