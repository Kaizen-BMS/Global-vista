"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";
import { apiFetch } from "@/components/shared/apiClient";
import { FOLLOWUP_TYPES } from "@/lib/modules/crm/constants/leadStages";

/**
 * "Select several students, fill in notes/follow-up/stream/stage per
 * student, click OK" — one editable row per selected student, pre-filled
 * with their current stage (already in-memory from the leads list) and
 * current Stream (fetched once per student on open, since custom-field
 * values aren't part of the leads list query). A blank cell on submit
 * means "leave this field unchanged" for that student.
 */
export default function BulkPreviewEditModal({ students, stages, streamOptions, onClose, onSubmit }) {
  const [rows, setRows] = useState(() => students.map((s) => ({ id: s.id, name: s.name, note: "", followupType: "Phone Call", followupDate: "", stream: "", stage: s.stage })));
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(students.map((s) =>
      apiFetch(`/api/leads/${s.id}/custom-field-values`).then((r) => r.json()).then((d) => {
        const streamVal = (d.values || []).find((v) => v.field_key === "stream")?.value || "";
        return { id: s.id, stream: streamVal };
      }).catch(() => ({ id: s.id, stream: "" }))
    )).then((results) => {
      if (cancelled) return;
      setRows((prev) => prev.map((r) => ({ ...r, stream: results.find((x) => x.id === r.id)?.stream || "" })));
      setLoadingStreams(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRow(id, key, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit() {
    setSaving(true);
    try { await onSubmit(rows); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <ModalFocusTrap>
        <div role="dialog" aria-modal="true" aria-label="Bulk edit selected students" className="relative w-full max-w-5xl max-h-[85vh] flex flex-col bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <p className="text-foreground font-medium">Bulk Edit — {students.length} selected</p>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-sm border-separate border-spacing-y-1.5">
              <thead>
                <tr className="text-muted-foreground text-xs text-left">
                  <th className="px-2 font-medium">Student</th>
                  <th className="px-2 font-medium">Note</th>
                  <th className="px-2 font-medium">Follow-up Type</th>
                  <th className="px-2 font-medium">Follow-up Date</th>
                  <th className="px-2 font-medium">Stream</th>
                  <th className="px-2 font-medium">Stage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="bg-card">
                    <td className="px-2 py-1.5 rounded-l-lg text-foreground whitespace-nowrap">{row.name}</td>
                    <td className="px-2 py-1.5">
                      <input value={row.note} onChange={(e) => updateRow(row.id, "note", e.target.value)} placeholder="Optional" className="w-44 px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={row.followupType} onChange={(e) => updateRow(row.id, "followupType", e.target.value)} className="px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs cursor-pointer">
                        {FOLLOWUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="date" value={row.followupDate} onChange={(e) => updateRow(row.id, "followupDate", e.target.value)} className="px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select disabled={loadingStreams} value={row.stream} onChange={(e) => updateRow(row.id, "stream", e.target.value)} className="px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs cursor-pointer disabled:opacity-50">
                        <option value="">{loadingStreams ? "Loading..." : "No change"}</option>
                        {streamOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 rounded-r-lg">
                      <select value={row.stage} onChange={(e) => updateRow(row.id, "stage", e.target.value)} className="px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs cursor-pointer">
                        {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
            <button type="button" disabled={saving} onClick={handleSubmit} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save All
            </button>
          </div>
        </div>
      </ModalFocusTrap>
    </div>
  );
}
