"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Search, Send, ExternalLink, Loader2, MessageCircle, CalendarClock } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime, formatTime, dayLabel } from "@/lib/helpers/dateFormat";
import { DISPOSITION_COLORS } from "@/lib/modules/crm/constants/leadStages";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

/**
 * A WhatsApp-styled log of interactions recorded against this lead — NOT a
 * live two-way WhatsApp integration (no such API is connected). Every entry
 * here is a `lead_followups` row of type "WhatsApp", the same data source
 * the Activity Timeline already reads, so a "message" logged here also
 * shows up there. "Send" logs what was said and opens the lead's real
 * WhatsApp thread (wa.me) so the agent can actually deliver it.
 */
export default function LeadWhatsAppPanel({ leadId, lead, initialFollowups, canManageFollowups }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [followups, setFollowups] = useState(initialFollowups);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const number = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");

  const thread = useMemo(() => {
    let items = followups.filter((f) => f.type === "WhatsApp");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((f) => (f.notes || f.outcome || "").toLowerCase().includes(q));
    }
    return [...items].sort((a, b) => new Date(a.created_at || a.scheduled_at) - new Date(b.created_at || a.scheduled_at));
  }, [followups, search]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [thread.length]);

  async function reload() {
    const res = await apiFetch(`/api/leads/${leadId}/followups`);
    if (res.ok) setFollowups((await res.json()).followups);
    refreshSidebarBadges();
    router.refresh();
  }

  async function send(alsoOpenWhatsApp) {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/followups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quickLog", type: "WhatsApp", note: draft.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to log message.");
      setDraft("");
      await reload();
      if (alsoOpenWhatsApp && number) window.open(`https://wa.me/${number}?text=${encodeURIComponent(draft.trim())}`, "_blank");
      toast.success("Logged.");
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  }

  if (!canManageFollowups && thread.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">No WhatsApp interactions logged yet.</p>;
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 380 }}>
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center"><MessageCircle className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="text-foreground text-sm font-medium truncate">{lead.name}</p>
            <p className="text-muted-foreground text-[11px] truncate">{lead.whatsapp || lead.phone || "No number on file"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-32 pl-7 pr-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs" />
          </div>
          {number && (
            <a href={`https://wa.me/${number}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs hover:bg-emerald-500/20 transition cursor-pointer">
              <ExternalLink className="h-3.5 w-3.5" /> Open WhatsApp
            </a>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: 340 }}>
        {thread.length === 0 && <p className="text-muted-foreground text-sm py-10 text-center">No WhatsApp interactions logged yet.{canManageFollowups ? " Log one below." : ""}</p>}
        {thread.map((f, i) => {
          const showDay = i === 0 || dayLabel(f.created_at, timezone) !== dayLabel(thread[i - 1].created_at, timezone);
          const scheduled = f.status === "Scheduled";
          return (
            <div key={f.id}>
              {showDay && <p className="text-center text-[10px] text-muted-foreground uppercase tracking-wider my-2">{dayLabel(f.created_at || f.scheduled_at, timezone)}</p>}
              {scheduled ? (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-violet-400 bg-violet-500/5 border border-violet-500/20 rounded-full px-3 py-1 mx-auto w-fit">
                  <CalendarClock className="h-3 w-3" /> Reminder scheduled for {formatDateTime(f.scheduled_at, timezone)}
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-emerald-500/10 border border-emerald-500/25 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                    <p className="text-foreground text-sm whitespace-pre-wrap">{f.notes || f.outcome || "(no note)"}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      {f.disposition && <span className={`px-1.5 py-0.5 rounded-md border text-[9px] ${DISPOSITION_COLORS[f.disposition] || ""}`}>{f.disposition}</span>}
                      <span className="text-muted-foreground text-[10px]">{f.created_by_name}</span>
                      <span className="text-muted-foreground text-[10px]">{formatTime(f.created_at, timezone)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canManageFollowups && (
        <div className="flex items-end gap-2 mt-3 pt-3 border-t border-border">
          <textarea
            rows={1} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(false); } }}
            placeholder="Log what you discussed on WhatsApp…"
            className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={() => send(true)} disabled={sending || !draft.trim()} title="Log and open WhatsApp" className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
