"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  UploadCloud, Download, Trash2, RefreshCw, CheckCircle2, XCircle, Clock,
  AlertTriangle, FileText, Loader2, ShieldAlert,
} from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDate, formatDateTime } from "@/lib/helpers/dateFormat";
import EmptyState from "@/components/shared/EmptyState";
import { SkeletonRows } from "@/components/shared/Skeleton";

const STATUS_META = {
  Pending: { label: "Pending Review", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: Clock },
  Approved: { label: "Approved", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  Rejected: { label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  Expired: { label: "Expired", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: AlertTriangle },
  "Needs Renewal": { label: "Needs Renewal", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  "Re-upload Requested": { label: "Re-upload Requested", color: "text-orange-400 bg-orange-500/10 border-orange-500/30", icon: RefreshCw },
  Uploaded: { label: "Uploaded", color: "text-sky-400 bg-sky-500/10 border-sky-500/30", icon: FileText },
  Missing: { label: "Missing", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: ShieldAlert },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Uploaded;
  const Icon = meta.icon;
  return <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${meta.color}`}><Icon className="h-3 w-3" />{meta.label}</span>;
}

function ProgressCircle({ percent }) {
  const r = 26, c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--chart-1)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-foreground text-xs font-semibold">{percent}%</span>
    </div>
  );
}

function SummaryBar({ summary }) {
  const items = [
    { label: "Required", value: summary.required },
    { label: "Uploaded", value: summary.uploaded },
    { label: "Pending", value: summary.pending, color: "text-amber-400" },
    { label: "Approved", value: summary.approved, color: "text-emerald-400" },
    { label: "Rejected", value: summary.rejected, color: "text-red-400" },
    { label: "Missing", value: summary.missing, color: summary.missing > 0 ? "text-red-400" : undefined },
  ];
  return (
    <div className="flex items-center gap-6 bg-card border border-border rounded-xl p-4 mb-5 flex-wrap">
      <ProgressCircle percent={summary.progressPercent} />
      <div className="flex items-center gap-5 flex-wrap">
        {items.map((i) => (
          <div key={i.label}>
            <p className={`text-lg font-semibold ${i.color || "text-foreground"}`}>{i.value}</p>
            <p className="text-muted-foreground text-[11px]">{i.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadDropzone({ userId, type, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const inputRef = useRef(null);
  const accept = type.allowed_file_types.split(",").map((t) => `.${t.trim()}`).join(",");

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = type.allowed_file_types.split(",").map((t) => t.trim().toLowerCase());
    if (!allowed.includes(ext)) { toast.error(`Only ${type.allowed_file_types} allowed.`); return; }
    if (file.size > type.max_file_size_mb * 1024 * 1024) { toast.error(`Max size is ${type.max_file_size_mb}MB.`); return; }
    if (type.expiry_required && !expiryDate) { toast.error("Set an expiry date before uploading."); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentTypeId", type.id);
      if (expiryDate) formData.append("expiryDate", expiryDate);
      const res = await apiFetch(`/api/core/users/${userId}/documents/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast.success(`${type.name} uploaded.`);
      onUploaded();
    } catch (err) { toast.error(err.message); } finally { setUploading(false); }
  }

  return (
    <div className="space-y-2">
      {type.expiry_required && (
        <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs" placeholder="Expiry date" />
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-5 px-3 text-center cursor-pointer transition ${dragging ? "border-indigo-500 bg-indigo-500/5" : "border-border hover:border-muted-foreground/40"}`}
      >
        {uploading ? <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /> : <UploadCloud className="h-5 w-5 text-muted-foreground" />}
        <p className="text-muted-foreground text-xs">{uploading ? "Uploading…" : "Drag & drop or click to browse"}</p>
        <p className="text-muted-foreground/60 text-[10px] uppercase">{type.allowed_file_types} · max {type.max_file_size_mb}MB</p>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function DocumentSlot({ userId, type, doc, canManage, isSelf, timezone, onChanged }) {
  const [replacing, setReplacing] = useState(false);
  const [reviewing, setReviewing] = useState(null); // "approve" | "reject" | "request_reupload"
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const canDelete = canManage || (isSelf && doc && ["Pending", "Rejected", "Re-upload Requested"].includes(doc.status));
  const canUpload = (isSelf || canManage) && (!doc || type.multiple_files_allowed || replacing || ["Rejected", "Re-upload Requested"].includes(doc?.status));

  async function download() {
    try {
      const res = await apiFetch(`/api/core/users/${userId}/documents/${doc.id}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch { toast.error("Failed to open document."); }
  }

  async function remove() {
    if (!confirm(`Remove ${doc.file_name}?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/core/users/${userId}/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Removed.");
      onChanged();
    } catch (err) { toast.error(err.message || "Failed to remove."); } finally { setBusy(false); }
  }

  async function submitReview() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/core/users/${userId}/documents/${doc.id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: reviewing, remarks }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Review saved.");
      setReviewing(null); setRemarks("");
      onChanged();
    } catch (err) { toast.error(err.message || "Failed."); } finally { setBusy(false); }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition hover:border-muted-foreground/30">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-medium truncate flex items-center gap-1.5">
            {type.name}
            {!!type.is_required && <span className="text-red-400 text-xs">*</span>}
          </p>
          {type.description && <p className="text-muted-foreground text-[11px] mt-0.5">{type.description}</p>}
        </div>
        {doc ? <StatusBadge status={doc.status} /> : type.is_required ? <StatusBadge status="Missing" /> : null}
      </div>

      {doc && !replacing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-xs truncate">{doc.file_name}</p>
              <p className="text-muted-foreground text-[10px]">{formatDate(doc.created_at, timezone)} · {doc.uploaded_by_name || "—"}</p>
            </div>
          </div>
          {doc.expiry_date && <p className="text-muted-foreground text-[11px]">Expires {formatDate(doc.expiry_date, timezone)}</p>}
          {doc.remarks && <p className="text-xs text-muted-foreground/90 bg-muted/40 rounded-lg px-2.5 py-1.5">&ldquo;{doc.remarks}&rdquo; — {doc.reviewed_by_name}</p>}

          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={download} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition"><Download className="h-3 w-3" /> Download</button>
            {canUpload && <button onClick={() => setReplacing(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition"><RefreshCw className="h-3 w-3" /> Replace</button>}
            {canDelete && <button onClick={remove} disabled={busy} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer transition"><Trash2 className="h-3 w-3" /> Delete</button>}
          </div>

          {canManage && doc.status === "Pending" && !reviewing && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-border mt-2">
              <button onClick={() => setReviewing("approve")} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer transition mt-2"><CheckCircle2 className="h-3 w-3" /> Approve</button>
              <button onClick={() => setReviewing("reject")} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer transition mt-2"><XCircle className="h-3 w-3" /> Reject</button>
              <button onClick={() => setReviewing("request_reupload")} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 cursor-pointer transition mt-2"><RefreshCw className="h-3 w-3" /> Re-upload</button>
            </div>
          )}
          {reviewing && (
            <div className="pt-2 border-t border-border mt-2 space-y-2">
              <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex items-center gap-2">
                <button onClick={submitReview} disabled={busy} className="btn-brand px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer disabled:opacity-60">{busy && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}Confirm</button>
                <button onClick={() => { setReviewing(null); setRemarks(""); }} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs cursor-pointer">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {(!doc || replacing) && canUpload && (
        <div>
          <UploadDropzone userId={userId} type={type} onUploaded={() => { setReplacing(false); onChanged(); }} />
          {replacing && <button onClick={() => setReplacing(false)} className="text-muted-foreground hover:text-foreground text-xs mt-2 cursor-pointer">Cancel</button>}
        </div>
      )}
      {!doc && !canUpload && <p className="text-muted-foreground text-xs">Not uploaded.</p>}
    </div>
  );
}

export default function EmployeeDocumentsPanel({ userId, isSelf }) {
  const timezone = useTimezone();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/core/users/${userId}/documents`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonRows rows={4} />;
  if (!data) return <p className="text-muted-foreground text-sm">Failed to load documents.</p>;
  if (data.documents.length === 0) return <EmptyState icon={ShieldAlert} title="No document types configured" description="Ask a Super Admin to set up document types in Settings → Document Types." />;

  return (
    <div>
      <SummaryBar summary={data.summary} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.documents.map(({ type, documents }) => (
          <DocumentSlot key={type.id} userId={userId} type={type} doc={documents[0] || null} canManage={data.canManage} isSelf={isSelf} timezone={timezone} onChanged={load} />
        ))}
      </div>
    </div>
  );
}
