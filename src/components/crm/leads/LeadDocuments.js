"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Download, Trash2, RefreshCw, UploadCloud, Loader2 } from "lucide-react";
import { DOCUMENT_TYPES } from "@/lib/modules/crm/constants/leadStages";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDate } from "@/lib/helpers/dateFormat";
import { formatBytes } from "@/lib/helpers/formatBytes";
import EmptyState from "@/components/shared/EmptyState";

function UploadDropzone({ leadId, onUploaded }) {
  const [type, setType] = useState(DOCUMENT_TYPES[0]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await apiFetch(`/api/leads/${leadId}/documents/upload`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast.success(`${type} document uploaded.`);
      onUploaded();
    } catch (err) { toast.error(err.message); } finally { setUploading(false); }
  }

  return (
    <div className="space-y-2 mb-4">
      <select value={type} onChange={(e) => setType(e.target.value)} className="w-full sm:w-56 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
        {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-6 px-3 text-center cursor-pointer transition ${dragging ? "border-indigo-500 bg-indigo-500/5" : "border-border hover:border-muted-foreground/40"}`}
      >
        {uploading ? <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /> : <UploadCloud className="h-5 w-5 text-muted-foreground" />}
        <p className="text-muted-foreground text-xs">{uploading ? "Uploading…" : "Drag & drop or click to browse"}</p>
        <p className="text-muted-foreground/60 text-[10px] uppercase">PDF, JPG, PNG, WEBP, DOC, DOCX · max 10MB</p>
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function DocumentRow({ leadId, doc, canManage, timezone, onChanged }) {
  const [busy, setBusy] = useState(false);
  const replaceInputRef = useRef(null);

  async function download() {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/documents/${doc.id}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch { toast.error("Failed to open document."); }
  }

  async function remove() {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/documents?docId=${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Document deleted.");
      onChanged();
    } catch (err) { toast.error(err.message || "Failed to delete."); } finally { setBusy(false); }
  }

  async function handleReplace(file) {
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", doc.type);
      const res = await apiFetch(`/api/leads/${leadId}/documents/${doc.id}/replace`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Replace failed.");
      toast.success("Document replaced.");
      onChanged();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-foreground text-sm truncate">{doc.file_name}</p>
          <p className="text-muted-foreground text-xs">
            {doc.type} · {formatBytes(doc.file_size)} · {formatDate(doc.created_at, timezone)} · {doc.uploaded_by_name || "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={download} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition disabled:opacity-50">
          <Download className="h-3.5 w-3.5" />
        </button>
        {canManage && (
          <>
            <input ref={replaceInputRef} type="file" className="hidden" onChange={(e) => handleReplace(e.target.files?.[0])} />
            <button onClick={() => replaceInputRef.current?.click()} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
            <button onClick={remove} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer transition disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LeadDocuments({ leadId, documents: initialDocuments, canManage }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [documents, setDocuments] = useState(initialDocuments);

  useEffect(() => { setDocuments(initialDocuments); }, [initialDocuments]);

  const reload = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/documents`);
      const data = await res.json();
      if (res.ok) setDocuments(data.documents || []);
    } catch { /* keep showing last-known list */ }
    router.refresh();
  }, [leadId, router]);

  return (
    <div>
      {canManage && <UploadDropzone leadId={leadId} onUploaded={reload} />}
      <div className="space-y-2">
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title="No documents uploaded" description="Upload passports, test scores, offer letters, or other files for this lead." />
        ) : (
          documents.map((doc) => (
            <DocumentRow key={doc.id} leadId={leadId} doc={doc} canManage={canManage} timezone={timezone} onChanged={reload} />
          ))
        )}
      </div>
    </div>
  );
}
