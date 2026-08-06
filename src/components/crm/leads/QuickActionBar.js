"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, MessageCircle, Mail, Loader2, X } from "lucide-react";
import { FOLLOWUP_TYPES } from "@/lib/modules/crm/constants/leadStages";
import { apiFetch } from "@/components/shared/apiClient";

const ACTIONS = [
  { type: "Phone Call", icon: Phone, color: "hover:border-green-500/40 hover:bg-green-500/5", href: (l) => `tel:${l.phone}` },
  { type: "WhatsApp", icon: MessageCircle, color: "hover:border-emerald-500/40 hover:bg-emerald-500/5", href: (l) => `https://wa.me/${(l.whatsapp || l.phone || "").replace(/\D/g, "")}` },
  { type: "Email", icon: Mail, color: "hover:border-indigo-500/40 hover:bg-indigo-500/5", href: (l) => (l.email ? `mailto:${l.email}` : null) },
];

export default function QuickActionBar({ lead, canManage }) {
  const router = useRouter();
  const [modalType, setModalType] = useState(null);
  const [note, setNote] = useState("");
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
        body: JSON.stringify({ action: "quickLog", type: modalType, note, nextFollowUp: nextFollowUp || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Activity logged.");
      setModalType(null); setNote(""); setNextFollowUp("");
      router.refresh();
    } catch { toast.error("Failed to log activity."); } finally { setSaving(false); }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const disabled = !action.href(lead);
          return (
            <button
              key={action.type}
              onClick={() => openAction(action)}
              disabled={disabled}
              title={action.type}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${action.color}`}
            >
              <Icon className="h-4 w-4" /> {action.type}
            </button>
          );
        })}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setModalType(null)} />
          <form onSubmit={submitLog} className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-medium">Log {modalType}</p>
              <button type="button" onClick={() => setModalType(null)} className="text-neutral-500 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <label className="block text-xs text-neutral-500 mb-1.5">What happened?</label>
            <textarea
              autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Interested in UK September intake, asked to call again tomorrow at 4 PM"
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <label className="block text-xs text-neutral-500 mb-1.5">Next follow-up (optional)</label>
            <input
              type="datetime-local" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm mb-5"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm cursor-pointer">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
