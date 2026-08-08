"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, MessageCircle, CheckCircle2, AlertTriangle, Clock, CalendarClock, CalendarDays, Star, CalendarCheck2, ChevronDown } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import FollowupCompleteModal from "@/components/crm/leads/FollowupCompleteModal";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

const SECTIONS = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, color: "text-red-400", accent: "border-red-500/30 bg-red-500/5" },
  { key: "today", label: "Today", icon: Clock, color: "text-indigo-400", accent: "border-indigo-500/30 bg-indigo-500/5" },
  { key: "tomorrow", label: "Tomorrow", icon: CalendarClock, color: "text-sky-400", accent: "border-sky-500/30 bg-sky-500/5" },
  { key: "thisWeek", label: "This Week", icon: CalendarDays, color: "text-foreground", accent: "border-border bg-card" },
  { key: "upcoming", label: "Upcoming", icon: CalendarCheck2, color: "text-muted-foreground", accent: "border-border bg-card" },
  { key: "highPriority", label: "High Priority", icon: Star, color: "text-amber-400", accent: "border-amber-500/30 bg-amber-500/5" },
  { key: "completedToday", label: "Completed Today", icon: CheckCircle2, color: "text-emerald-400", accent: "border-emerald-500/30 bg-emerald-500/5" },
];

export default function FollowupDashboard({ data }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [collapsed, setCollapsed] = useState({});
  const [local, setLocal] = useState(data);
  const [completingFollowup, setCompletingFollowup] = useState(null);

  async function complete(details) {
    try {
      const res = await apiFetch(`/api/leads/${completingFollowup.lead_id}/followups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", followupId: completingFollowup.id, ...details }),
      });
      if (!res.ok) throw new Error();
      toast.success("Marked complete.");
      setLocal((prev) => {
        const next = { ...prev };
        for (const key of ["overdue", "today", "tomorrow", "thisWeek", "upcoming", "highPriority"]) next[key] = next[key].filter((f) => f.id !== completingFollowup.id);
        return next;
      });
      setCompletingFollowup(null);
      router.refresh();
    } catch { toast.error("Failed to complete."); }
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
              <h2 className="text-sm font-semibold text-foreground">{section.label}</h2>
              <span className="text-muted-foreground text-xs">({items.length})</span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
            </button>
            {!isCollapsed && (
              items.length === 0 ? (
                <p className="text-muted-foreground text-sm pb-2">Nothing here.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((f) => (
                    <div key={f.id} className={`rounded-xl border p-3.5 transition hover:-translate-y-0.5 ${section.accent}`}>
                      <div className="flex items-start justify-between mb-1.5">
                        <Link href={`/workspace/lead-management/${f.lead_id}`} className="text-foreground text-sm font-medium hover:text-indigo-400 cursor-pointer truncate">{f.lead_name}</Link>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground shrink-0">{f.priority}</span>
                      </div>
                      <p className="text-muted-foreground text-xs mb-2">{f.type} · {formatDateTime(f.scheduled_at, timezone)}</p>
                      <p className="text-muted-foreground text-xs mb-3">{f.assigned_name || "Unassigned"}</p>
                      <div className="flex items-center gap-1.5">
                        <a href={`tel:${f.lead_phone}`} className="p-1.5 rounded-lg bg-card/60 border border-border text-muted-foreground hover:text-foreground cursor-pointer transition"><Phone className="h-3.5 w-3.5" /></a>
                        <a href={`https://wa.me/${(f.lead_phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-card/60 border border-border text-muted-foreground hover:text-foreground cursor-pointer transition"><MessageCircle className="h-3.5 w-3.5" /></a>
                        {section.key !== "completedToday" && (
                          <button onClick={() => setCompletingFollowup(f)} className="ml-auto flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer transition">
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

      {completingFollowup && (
        <FollowupCompleteModal
          followupType={completingFollowup.type}
          onClose={() => setCompletingFollowup(null)}
          onSubmit={complete}
        />
      )}
    </div>
  );
}
