"use client";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Phone, User } from "lucide-react";
import { LEAD_STAGES, STAGE_COLORS, PRIORITY_COLORS } from "@/lib/modules/crm/constants/leadStages";
import { apiFetch } from "@/components/shared/apiClient";
import LeadPreviewDrawer from "@/components/crm/leads/LeadPreviewDrawer";

export default function KanbanBoard({ initialLeads }) {
  const [leads, setLeads] = useState(initialLeads);
  const [dragId, setDragId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const savingRef = useRef(new Set());

  const columns = useMemo(() => {
    const map = new Map(LEAD_STAGES.map((s) => [s, []]));
    for (const lead of leads) { if (map.has(lead.stage)) map.get(lead.stage).push(lead); }
    return map;
  }, [leads]);

  async function moveLead(leadId, newStage) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;
    const prevStage = lead.stage;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l)));
    savingRef.current.add(leadId);
    try {
      const res = await apiFetch(`/api/leads/${leadId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }) });
      if (!res.ok) throw new Error();
      toast.success(`${lead.name} moved to ${newStage}`);
    } catch {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: prevStage } : l)));
      toast.error("Failed to update stage.");
    } finally {
      savingRef.current.delete(leadId);
    }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => {
          const items = columns.get(stage) || [];
          const isOver = dragOverStage === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
              onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => { e.preventDefault(); setDragOverStage(null); if (dragId) moveLead(dragId, stage); }}
              className={`shrink-0 w-72 rounded-xl border transition-colors ${isOver ? "border-indigo-500 bg-indigo-500/5" : "border-neutral-800 bg-neutral-950/50"}`}
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-800 sticky top-0 bg-neutral-950/80 backdrop-blur rounded-t-xl">
                <span className={`text-xs font-medium px-2 py-1 rounded-md border ${STAGE_COLORS[stage] || "bg-neutral-700/20 text-neutral-400 border-neutral-600/30"}`}>{stage}</span>
                <span className="text-neutral-500 text-xs font-medium">{items.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[80px] max-h-[calc(100vh-260px)] overflow-y-auto">
                {items.length === 0 && <p className="text-neutral-700 text-xs text-center py-6 select-none">No leads</p>}
                {items.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setPreviewId(lead.id)}
                    className={`group bg-neutral-900 border border-neutral-800 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:border-neutral-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${dragId === lead.id ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-white text-sm font-medium truncate">{lead.name}</p>
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border ${PRIORITY_COLORS[lead.priority] || ""}`}>{lead.priority}</span>
                    </div>
                    <p className="text-neutral-500 text-xs mb-2">{lead.lead_number}</p>
                    <div className="flex items-center gap-3 text-neutral-500 text-xs">
                      <span className="flex items-center gap-1 truncate"><Phone className="h-3 w-3 shrink-0" />{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-500 text-xs mt-1.5">
                      <User className="h-3 w-3 shrink-0" /> {lead.assigned_name || "Unassigned"}
                    </div>
                    {lead.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lead.tags.split(",").filter(Boolean).slice(0, 3).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700">#{t.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {previewId && <LeadPreviewDrawer leadId={previewId} onClose={() => setPreviewId(null)} />}
    </>
  );
}
