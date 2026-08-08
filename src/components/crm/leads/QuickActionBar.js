"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, MessageCircle, Mail, Users, MessageSquare, Sparkles, Loader2, X } from "lucide-react";
import { FOLLOWUP_DISPOSITIONS } from "@/lib/modules/crm/constants/leadStages";
import { apiFetch } from "@/components/shared/apiClient";

const ACTIONS = [
  { type: "Phone Call", icon: Phone, color: "hover:border-green-500/40 hover:bg-green-500/5", hasHref: true, href: (l) => `tel:${l.phone}` },
  { type: "WhatsApp", icon: MessageCircle, color: "hover:border-emerald-500/40 hover:bg-emerald-500/5", hasHref: true, href: (l) => `https://wa.me/${(l.whatsapp || l.phone || "").replace(/\D/g, "")}` },
  { type: "Email", icon: Mail, color: "hover:border-indigo-500/40 hover:bg-indigo-500/5", hasHref: true, href: (l) => (l.email ? `mailto:${l.email}` : null) },
  { type: "SMS", icon: MessageSquare, color: "hover:border-sky-500/40 hover:bg-sky-500/5", hasHref: true, href: (l) => `sms:${l.phone}` },
  { type: "Meeting", icon: Users, color: "hover:border-purple-500/40 hover:bg-purple-500/5", hasHref: false, href: () => null },
  { type: "Custom", icon: Sparkles, color: "hover:border-border/40 hover:bg-muted-foreground/5", hasHref: false, href: () => null },
];

export default function QuickActionBar({ lead, canManage }) {
  const router = useRouter();
  const [modalType, setModalType] = useState(null);
  const [note, setNote] = useState("");
  const [disposition, setDisposition] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  function openAction(action) {
    const href = action.href(lead);
    if (href) window.open(href, action.type === "WhatsApp" ? "_blank" : "_self");
    if (canManage) setModalType(action.type);
  }

  async function submitLog(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${lead.id}/followups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quickLog", type: modalType, note, nextFollowUp: nextFollowUp || null,
          disposition: disposition || null, durationSeconds: durationMinutes ? Number(durationMinutes) * 60 : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Activity logged.");
      setModalType(null); setNote(""); setNextFollowUp(""); setDisposition(""); setDurationMinutes("");
      router.refresh();
    } catch { toast.error("Failed to log activity."); } finally { setSaving(false); }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const disabled = action.hasHref && !action.href(lead);
          return (
            <button
              key={action.type}
              onClick={() => openAction(action)}
              disabled={disabled}
              title={action.type}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${action.color}`}
            >
              <Icon className="h-4 w-4" /> {action.type}
            </button>
          );
        })}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setModalType(null)} />
          <form onSubmit={submitLog} className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <p className="text-foreground font-medium">Log {modalType}</p>
              <button type="button" onClick={() => setModalType(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <label className="block text-xs text-muted-foreground mb-1.5">What happened?</label>
            <textarea
              autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Interested in UK September intake, asked to call again tomorrow at 4 PM"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Interested / Not Interested</label>
                <select value={disposition} onChange={(e) => setDisposition(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
                  <option value="">Not set</option>
                  {FOLLOWUP_DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {(modalType === "Phone Call" || modalType === "Meeting") && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Duration (minutes)</label>
                  <input type="number" min="0" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                </div>
              )}
            </div>

            <label className="block text-xs text-muted-foreground mb-1.5">Next follow-up (optional)</label>
            <input
              type="datetime-local" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-5"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
              <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
