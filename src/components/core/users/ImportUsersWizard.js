"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Loader2, Upload, Download, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";
import { CANONICAL_FIELDS, autoDetectMapping } from "@/lib/constants/userImport";

const STEPS = ["Upload", "Map Columns", "Review", "Import"];

export default function ImportUsersWizard({ onClose }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState({});
  const [validation, setValidation] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [sendWelcomeEmails, setSendWelcomeEmails] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function handleFileSelect(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("action", "parse");
      fd.append("file", selected);
      const res = await apiFetch("/api/users/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse file.");
      setHeaders(data.headers);
      setPreviewRows(data.previewRows);
      setTotalRows(data.totalRows);
      setMapping(autoDetectMapping(data.headers));
      setStep(1);
    } catch (err) {
      toast.error(err.message);
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  function setColumnMapping(index, key) {
    setMapping((m) => ({ ...m, [index]: key || undefined }));
  }

  async function handleValidate() {
    const requiredMissing = CANONICAL_FIELDS.filter((f) => f.required && !Object.values(mapping).includes(f.key));
    if (requiredMissing.length > 0) {
      toast.error(`Map required fields: ${requiredMissing.map((f) => f.label).join(", ")}`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("action", "validate");
      fd.append("file", file);
      fd.append("mapping", JSON.stringify(mapping));
      const res = await apiFetch("/api/users/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed.");
      setValidation(data.validation);
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("action", "commit");
      fd.append("file", file);
      fd.append("mapping", JSON.stringify(mapping));
      fd.append("skipDuplicates", String(skipDuplicates));
      fd.append("sendWelcomeEmails", String(sendWelcomeEmails));
      const res = await apiFetch("/api/users/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");
      setResult(data);
      setStep(3);
      router.refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadErrorReport() {
    if (!result?.errorReport?.length) return;
    const headerRow = "Row,Email,Reason";
    const lines = result.errorReport.map((e) => `${e.row},"${e.email || ""}","${(e.reason || "").replace(/"/g, '""')}"`);
    const csv = [headerRow, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Import Users</h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex-1 text-center text-xs pb-2 border-b-2 ${i <= step ? "border-indigo-500 text-white" : "border-neutral-800 text-neutral-500"}`}>
                {s}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="text-center py-10">
              <Upload className="h-10 w-10 text-neutral-600 mx-auto mb-4" />
              <p className="text-white mb-1">Upload a CSV or XLSX file</p>
              <p className="text-neutral-500 text-sm mb-6">Max 5MB, up to 500 rows per import.</p>

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium cursor-pointer transition">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Choose File
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} disabled={busy} />
              </label>

              <div className="mt-6">
                <a
                  href="/api/users/import/template"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <Download className="h-3.5 w-3.5" /> Download Sample Template
                </a>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-neutral-400 text-sm mb-4">
                {totalRows} rows detected. Map each column to a CRM field — required fields must be mapped.
              </p>
              <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                {headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-neutral-300 truncate">{header}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                    <select
                      value={mapping[i] || ""}
                      onChange={(e) => setColumnMapping(i, e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm"
                    >
                      <option value="">— Ignore this column —</option>
                      {CANONICAL_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(0)} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm">Back</button>
                <button
                  onClick={handleValidate}
                  disabled={busy}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Validate
                </button>
              </div>
            </div>
          )}

          {step === 2 && validation && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <StatCard label="Valid" value={validation.valid} color="text-green-400" />
                <StatCard label="Duplicates" value={validation.duplicate} color="text-orange-400" />
                <StatCard label="Invalid" value={validation.invalid} color="text-red-400" />
              </div>

              <div className="max-h-64 overflow-y-auto mb-4 border border-neutral-800 rounded-lg divide-y divide-neutral-800">
                {validation.rows.filter((r) => r.status !== "valid").map((r) => (
                  <div key={r.rowNumber} className="px-3 py-2 text-xs">
                    <span className={r.status === "duplicate" ? "text-orange-400" : "text-red-400"}>
                      Row {r.rowNumber} ({r.raw.email || "no email"}):
                    </span>{" "}
                    <span className="text-neutral-400">{r.status === "duplicate" ? r.duplicateReason : r.errors.join(", ")}</span>
                  </div>
                ))}
                {validation.rows.every((r) => r.status === "valid") && (
                  <p className="px-3 py-4 text-center text-neutral-500 text-xs">All rows passed validation.</p>
                )}
              </div>

              <div className="space-y-2 mb-6">
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                  Skip duplicate rows (recommended)
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input type="checkbox" checked={sendWelcomeEmails} onChange={(e) => setSendWelcomeEmails(e.target.checked)} />
                  Send welcome emails to imported users
                </label>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm">Back</button>
                <button
                  onClick={handleCommit}
                  disabled={busy || validation.valid === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import {validation.valid} Valid Row{validation.valid !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-white text-lg font-medium mb-1">Import Complete</h3>
              <div className="grid grid-cols-3 gap-3 my-6 max-w-sm mx-auto">
                <StatCard label="Imported" value={result.importedCount} color="text-green-400" />
                <StatCard label="Skipped" value={result.skippedCount} color="text-orange-400" />
                <StatCard label="Failed" value={result.failedCount} color="text-red-400" />
              </div>
              {result.errorReport.length > 0 && (
                <button onClick={downloadErrorReport} className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mb-4">
                  <Download className="h-4 w-4" /> Download Error Report
                </button>
              )}
              <div>
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
                  Done
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-neutral-800/60 border border-neutral-800 rounded-lg p-3 text-center">
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="text-neutral-500 text-xs mt-1">{label}</p>
    </div>
  );
}