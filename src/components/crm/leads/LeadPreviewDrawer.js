"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { X, Phone, MessageCircle, Mail, ExternalLink, Loader2 } from "lucide-react";
import { LEAD_PRIORITIES } from "@/lib/modules/crm/constants/leadStages";
import StageBadge from "@/components/crm/badges/StageBadge";
import { apiFetch } from "@/components/shared/apiClient";

export default function LeadPreviewDrawer({ leadId, onClose }) {
  const [lead, setLead] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/leads/${leadId}`).then((r) => r.json()).then((d) => { if (!cancelled) setLead(d.lead); });
    return () => { cancelled = true; };
  }, [leadId]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function updatePriority(priority) {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority }) });
      if (!res.ok) throw new Error();
      setLead((l) => ({ ...l, priority }));
      toast.success("Priority updated.");
    } catch { toast.error("Failed to update priority."); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-neutral-950 border-l border-neutral-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 sticky top-0 bg-neutral-950/90 backdrop-blur z-10">
          <p className="text-white font-medium">Lead Preview</p>
          <button onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {!lead ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 text-neutral-600 animate-spin" /></div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <p className="text-neutral-500 text-xs mb-1">{lead.lead_number}</p>
              <h2 className="text-white text-lg font-semibold">{lead.name}</h2>
              <div className="flex items-center gap-2 mt-2"><StageBadge stage={lead.stage} /></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <a href={`tel:${lead.phone}`} className="flex flex-col items-center gap-1 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-green-500/40 hover:bg-green-500/5 transition cursor-pointer">
                <Phone className="h-4 w-4" /><span className="text-[11px]">Call</span>
              </a>
              <a href={`https://wa.me/${(lead.whatsapp || lead.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/5 transition cursor-pointer">
                <MessageCircle className="h-4 w-4" /><span className="text-[11px]">WhatsApp</span>
              </a>
              <a href={lead.email ? `mailto:${lead.email}` : undefined} className={`flex flex-col items-center gap-1 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 transition cursor-pointer ${lead.email ? "hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/5" : "opacity-40 pointer-events-none"}`}>
                <Mail className="h-4 w-4" /><span className="text-[11px]">Email</span>
              </a>
            </div>

            <div className="space-y-2 text-sm">
              <Row label="Phone" value={lead.phone} />
              <Row label="Country" value={lead.country || "—"} />
              <Row label="Source" value={lead.source_name} />
              <Row label="Service" value={lead.service_name} />
              <Row label="Assigned To" value={lead.assigned_name || "Unassigned"} />
              <Row label="Next Follow-up" value={lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleString() : "—"} />
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Priority</label>
              <select disabled={saving} value={lead.priority} onChange={(e) => updatePriority(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm cursor-pointer">
                {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <Link href={`/workspace/lead-management/${lead.id}`} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition cursor-pointer">
              Open Full Profile <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-200 truncate max-w-[60%]">{value}</span>
    </div>
  );
}
