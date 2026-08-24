"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Download, Trash2, RefreshCw, UploadCloud, Loader2, ChevronDown, CheckCircle2 } from "lucide-react";
import { DOCUMENT_TYPES } from "@/lib/modules/crm/constants/leadStages";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDate } from "@/lib/helpers/dateFormat";
import { formatBytes } from "@/lib/helpers/formatBytes";
import EmptyState from "@/components/shared/EmptyState";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

function UploadDropzone({ leadId, documentTypes, onUploaded }) {
  const usingConfiguredTypes = documentTypes && documentTypes.length > 0;
  const [typeId, setTypeId] = useState(usingConfiguredTypes ? String(documentTypes[0].id) : "");
  const [legacyType, setLegacyType] = useState(DOCUMENT_TYPES[0]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const selectedTypeName = usingConfiguredTypes ? documentTypes.find((t) => String(t.id) === typeId)?.name : legacyType;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", selectedTypeName || "Other");
      if (usingConfiguredTypes) formData.append("documentTypeId", typeId);
      const res = await apiFetch(`/api/leads/${leadId}/documents/upload`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast.success(`${selectedTypeName} document uploaded.`);
      onUploaded();
    } catch (err) { toast.error(err.message); } finally { setUploading(false); }
  }

  return (
    <div className="space-y-2 mb-4">
      {usingConfiguredTypes ? (
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="w-full sm:w-56 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
          {documentTypes.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_required ? " (Required)" : ""}</option>)}
        </select>
      ) : (
        <select value={legacyType} onChange={(e) => setLegacyType(e.target.value)} className="w-full sm:w-56 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
          {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
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
      if (doc.document_type_id) formData.append("documentTypeId", doc.document_type_id);
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
            {doc.document_type_name || doc.type} · {formatBytes(doc.file_size)} · {formatDate(doc.created_at, timezone)} · {doc.uploaded_by_name || "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={download} disabled={busy} aria-label={`Download ${doc.file_name}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition disabled:opacity-50">
          <Download className="h-3.5 w-3.5" />
        </button>
        {canManage && (
          <>
            <input ref={replaceInputRef} type="file" className="hidden" onChange={(e) => handleReplace(e.target.files?.[0])} />
            <button onClick={() => replaceInputRef.current?.click()} disabled={busy} aria-label={`Replace ${doc.file_name}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
            <button onClick={remove} disabled={busy} aria-label={`Delete ${doc.file_name}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer transition disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TypeGroup({ type, docs, leadId, canManage, timezone, onChanged, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const uploaded = docs.length > 0;
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/40 transition cursor-pointer">
        <span className="flex items-center gap-2 text-sm text-foreground min-w-0">
          <span className="truncate">{type.name}</span>
          {!!type.is_required && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">Required</span>}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${uploaded ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : type.is_required ? "border-amber-500/30 text-amber-400 bg-amber-500/10" : "border-border text-muted-foreground"}`}>
            {uploaded && <CheckCircle2 className="h-3 w-3" />}
            {uploaded ? `Uploaded (${docs.length})` : "Pending"}
          </span>
          {uploaded && <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
        </span>
      </button>
      {open && uploaded && (
        <div className="p-2 pt-0 space-y-2">
          {docs.map((doc) => <DocumentRow key={doc.id} leadId={leadId} doc={doc} canManage={canManage} timezone={timezone} onChanged={onChanged} />)}
        </div>
      )}
    </div>
  );
}

export default function LeadDocuments({ leadId, documents: initialDocuments, canManage, documentTypes = [] }) {
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
    refreshSidebarBadges();
  }, [leadId, router]);

  const groupByType = documentTypes.length > 0;
  const byTypeId = new Map();
  const unmatched = [];
  if (groupByType) {
    for (const doc of documents) {
      const key = doc.document_type_id != null ? String(doc.document_type_id) : null;
      const matches = key && documentTypes.some((t) => String(t.id) === key);
      if (matches) {
        if (!byTypeId.has(key)) byTypeId.set(key, []);
        byTypeId.get(key).push(doc);
      } else {
        unmatched.push(doc);
      }
    }
  }

  return (
    <div>
      {canManage && <UploadDropzone leadId={leadId} documentTypes={documentTypes} onUploaded={reload} />}
      {documents.length === 0 && !groupByType ? (
        <EmptyState icon={FileText} title="No documents uploaded" description="Upload passports, test scores, offer letters, or other files for this lead." />
      ) : groupByType ? (
        <div className="space-y-2">
          {documentTypes.map((t) => {
            const docs = byTypeId.get(String(t.id)) || [];
            return <TypeGroup key={t.id} type={t} docs={docs} leadId={leadId} canManage={canManage} timezone={timezone} onChanged={reload} defaultOpen={docs.length > 0} />;
          })}
          {unmatched.length > 0 && (
            <div className="pt-2">
              <p className="text-muted-foreground text-xs mb-2">Other documents</p>
              <div className="space-y-2">
                {unmatched.map((doc) => <DocumentRow key={doc.id} leadId={leadId} doc={doc} canManage={canManage} timezone={timezone} onChanged={reload} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} leadId={leadId} doc={doc} canManage={canManage} timezone={timezone} onChanged={reload} />
          ))}
        </div>
      )}
    </div>
  );
}
