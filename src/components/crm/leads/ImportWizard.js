"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, Download, ArrowRight, ArrowLeft, CheckCircle2, XCircle,
  AlertTriangle, Loader2, Copy, X,
} from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { LEAD_IMPORT_FIELDS } from "@/lib/modules/crm/constants/leadImportFields";

const STEPS = ["Upload", "Map Columns", "Preview", "Import"];
const CHUNK_SIZE = 25;

const STATUS_STYLES = {
  valid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  invalid: "bg-red-500/10 text-red-400 border-red-500/30",
  duplicate: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

export default function ImportWizard({ sources, services }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [defaultLeadSourceId, setDefaultLeadSourceId] = useState(sources[0]?.id || "");
  const [defaultServiceId, setDefaultServiceId] = useState(services[0]?.id || "");
  const [validation, setValidation] = useState(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState("skip");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileSelect(selected) {
    if (!selected) return;
    const okType = /\.(xlsx|xls|csv)$/i.test(selected.name);
    if (!okType) { toast.error("Only .xlsx and .csv files are supported."); return; }
    setFile(selected);
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  }, []);

  async function parseFile() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("action", "parse");
      fd.append("file", file);
      const res = await apiFetch("/api/leads/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse file.");
      setHeaders(data.headers);
      setPreviewRows(data.previewRows);
      setMapping(data.suggestedMapping || {});
      setStep(1);
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  function setColumnMapping(colIndex, fieldKey) {
    setMapping((m) => {
      const next = { ...m };
      if (fieldKey) next[colIndex] = fieldKey; else delete next[colIndex];
      return next;
    });
  }

  async function validateFile() {
    const mappedFields = new Set(Object.values(mapping));
    if (!mappedFields.has("name") || !mappedFields.has("phone")) {
      toast.error("Map at least Name and Phone before continuing.");
      return;
    }
    if (!mappedFields.has("leadSourceName") && !defaultLeadSourceId) { toast.error("Map a Lead Source column or pick a default."); return; }
    if (!mappedFields.has("serviceName") && !defaultServiceId) { toast.error("Map a Service column or pick a default."); return; }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("action", "validate");
      fd.append("file", file);
      fd.append("mapping", JSON.stringify(mapping));
      if (defaultLeadSourceId) fd.append("defaultLeadSourceId", defaultLeadSourceId);
      if (defaultServiceId) fd.append("defaultServiceId", defaultServiceId);
      const res = await apiFetch("/api/leads/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed.");
      setValidation(data.validation);
      setStep(2);
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function runImport() {
    setBusy(true);
    setStep(3);
    const rows = validation.rows;
    const chunks = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) chunks.push(rows.slice(i, i + CHUNK_SIZE));

    const totals = { imported: 0, updated: 0, skipped: 0, failed: 0, errorReport: [] };
    const startedAt = Date.now();
    setProgress({ processed: 0, total: rows.length, ...totals, etaMs: null });

    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await apiFetch("/api/leads/import/commit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunks[i], duplicateStrategy }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Import batch failed.");
        totals.imported += data.importedCount;
        totals.updated += data.updatedCount;
        totals.skipped += data.skippedCount;
        totals.failed += data.failedCount;
        totals.errorReport.push(...data.errorReport);
      } catch (err) {
        totals.failed += chunks[i].length;
        totals.errorReport.push(...chunks[i].map((r) => ({ row: r.rowNumber, name: r.raw.name, phone: r.raw.phone, reason: err.message })));
      }
      const processed = Math.min((i + 1) * CHUNK_SIZE, rows.length);
      const elapsed = Date.now() - startedAt;
      const rate = elapsed / processed;
      const remaining = rows.length - processed;
      setProgress({ processed, total: rows.length, ...totals, etaMs: remaining > 0 ? Math.round(rate * remaining) : 0 });
    }

    const durationMs = Date.now() - startedAt;
    try {
      const res = await apiFetch("/api/leads/import/finalize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name, totalRows: rows.length, importedCount: totals.imported, updatedCount: totals.updated,
          skippedCount: totals.skipped, failedCount: totals.failed, duplicateCount: validation.duplicate,
          duplicateStrategy, mapping, errorReport: totals.errorReport, durationMs,
        }),
      });
      const data = await res.json();
      setResult({ ...totals, durationMs, historyId: data.historyId });
    } catch {
      setResult({ ...totals, durationMs, historyId: null });
    }
    setBusy(false);
    toast.success("Import finished.");
    router.refresh();
  }

  function reset() {
    setStep(0); setFile(null); setHeaders([]); setPreviewRows([]); setMapping({});
    setValidation(null); setResult(null); setProgress(null);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium shrink-0 transition-colors ${i < step ? "bg-emerald-500 text-white" : i === step ? "btn-brand text-white" : "bg-neutral-800 text-neutral-500"}`}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? "text-white" : "text-neutral-500"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-emerald-500/50" : "bg-neutral-800"}`} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-14 cursor-pointer transition-colors ${dragOver ? "border-indigo-500 bg-indigo-500/5" : "border-neutral-800 hover:border-neutral-700"}`}
          >
            <Upload className="h-10 w-10 text-neutral-600" />
            {file ? (
              <div className="flex items-center gap-2 text-white text-sm"><FileSpreadsheet className="h-4 w-4 text-emerald-400" /> {file.name}</div>
            ) : (
              <>
                <p className="text-white text-sm font-medium">Drag & drop your file here, or click to browse</p>
                <p className="text-neutral-500 text-xs">Supports .xlsx and .csv, up to 5MB / 500 rows</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0])} />
          </div>

          <div className="flex items-center gap-3 mt-4">
            <a href="/api/leads/import/template?format=xlsx" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs transition cursor-pointer"><Download className="h-3.5 w-3.5" /> Excel Template</a>
            <a href="/api/leads/import/template?format=csv" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs transition cursor-pointer"><Download className="h-3.5 w-3.5" /> CSV Template</a>
          </div>

          <div className="flex justify-end mt-8">
            <button onClick={parseFile} disabled={!file || busy} className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-40 cursor-pointer">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-neutral-400 text-sm mb-4">Match each column from your file to a CRM field. We've pre-matched what we could recognize.</p>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="px-4 py-3">File Column</th><th className="px-4 py-3">Sample</th><th className="px-4 py-3">Maps To</th></tr></thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i} className="border-b border-neutral-800/60">
                    <td className="px-4 py-3 text-white">{h || `Column ${i + 1}`}</td>
                    <td className="px-4 py-3 text-neutral-500 truncate max-w-[160px]">{previewRows[0]?.[i] || "—"}</td>
                    <td className="px-4 py-3">
                      <select value={mapping[i] || ""} onChange={(e) => setColumnMapping(i, e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs cursor-pointer">
                        <option value="">Don't import</option>
                        {LEAD_IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Default Lead Source (used when no column is mapped)</label>
              <select value={defaultLeadSourceId} onChange={(e) => setDefaultLeadSourceId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm cursor-pointer">
                <option value="">None</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Default Service (used when no column is mapped)</label>
              <select value={defaultServiceId} onChange={(e) => setDefaultServiceId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm cursor-pointer">
                <option value="">None</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm cursor-pointer"><ArrowLeft className="h-4 w-4" /> Back</button>
            <button onClick={validateFile} disabled={busy} className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-40 cursor-pointer">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Preview & Validate <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && validation && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <SummaryCard label="Valid" value={validation.valid} color="text-emerald-400" />
            <SummaryCard label="Duplicates" value={validation.duplicate} color="text-amber-400" />
            <SummaryCard label="Invalid" value={validation.invalid} color="text-red-400" />
          </div>

          {validation.duplicate > 0 && (
            <div className="mb-6">
              <label className="block text-xs text-neutral-500 mb-1.5">How should we handle duplicates?</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "skip", label: "Skip duplicates" },
                  { key: "update", label: "Update existing lead" },
                  { key: "import_anyway", label: "Import anyway (flag as duplicate)" },
                ].map((opt) => (
                  <button key={opt.key} onClick={() => setDuplicateStrategy(opt.key)} className={`px-3.5 py-2 rounded-lg text-xs border transition cursor-pointer ${duplicateStrategy === opt.key ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto mb-8 max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-900"><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="px-4 py-3">Row</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Details</th></tr></thead>
              <tbody>
                {validation.rows.map((r) => (
                  <tr key={r.rowNumber} className="border-b border-neutral-800/60">
                    <td className="px-4 py-3 text-neutral-500">{r.rowNumber}</td>
                    <td className="px-4 py-3 text-white">{r.raw.name || "—"}</td>
                    <td className="px-4 py-3 text-neutral-300">{r.raw.phone || "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-md border ${STATUS_STYLES[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">{r.status === "invalid" ? r.errors.join("; ") : r.duplicateReason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm cursor-pointer"><ArrowLeft className="h-4 w-4" /> Back</button>
            <button onClick={runImport} disabled={busy || validation.valid + validation.duplicate === 0} className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-40 cursor-pointer">
              Import {validation.valid + validation.duplicate} Leads <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          {!result ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">Importing…</p>
                <p className="text-neutral-500 text-xs">{progress?.processed || 0} / {progress?.total || 0} rows</p>
              </div>
              <div className="h-2.5 rounded-full bg-neutral-800 overflow-hidden mb-4">
                <div className="h-full btn-brand transition-all duration-300" style={{ width: `${progress ? (progress.processed / progress.total) * 100 : 0}%` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <SummaryCard label="Imported" value={progress?.imported || 0} color="text-emerald-400" small />
                <SummaryCard label="Updated" value={progress?.updated || 0} color="text-indigo-400" small />
                <SummaryCard label="Skipped" value={progress?.skipped || 0} color="text-neutral-400" small />
                <SummaryCard label="Failed" value={progress?.failed || 0} color="text-red-400" small />
              </div>
              {progress?.etaMs != null && progress.etaMs > 0 && (
                <p className="text-neutral-500 text-xs">~{Math.ceil(progress.etaMs / 1000)}s remaining</p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <div>
                  <p className="text-white font-medium">Import complete</p>
                  <p className="text-neutral-500 text-xs">Finished in {(result.durationMs / 1000).toFixed(1)}s</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <SummaryCard label="Imported" value={result.imported} color="text-emerald-400" />
                <SummaryCard label="Updated" value={result.updated} color="text-indigo-400" />
                <SummaryCard label="Skipped" value={result.skipped} color="text-neutral-400" />
                <SummaryCard label="Failed" value={result.failed} color="text-red-400" />
              </div>
              {result.failed > 0 && result.historyId && (
                <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-red-300 text-xs flex-1">{result.failed} row{result.failed === 1 ? "" : "s"} failed.</p>
                  <a href={`/api/leads/import/history/${result.historyId}/failed-rows?format=xlsx`} className="text-xs text-red-300 underline cursor-pointer">Download failed rows</a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button onClick={reset} className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm cursor-pointer">Import Another File</button>
                <a href="/workspace/lead-management" className="btn-brand px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer">View Leads</a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, small }) {
  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-xl text-center ${small ? "p-3" : "p-4"}`}>
      <p className={`font-semibold ${small ? "text-lg" : "text-2xl"} ${color}`}>{value}</p>
      <p className="text-neutral-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}
