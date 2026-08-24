"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, RefreshCw, Pencil, Power, History, X, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import EmptyState from "@/components/shared/EmptyState";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const MAPPABLE_FIELDS = [
  { key: "external_lead_id", label: "Lead ID (external)", required: true },
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
  { key: "campaign", label: "Campaign" },
  { key: "ad_set", label: "Ad Set" },
  { key: "ad", label: "Ad" },
  { key: "platform", label: "Platform" },
];

const STATUS_META = {
  success: { label: "Success", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  partial: { label: "Partial", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  failed: { label: "Failed", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
};

function ResultBadge({ status }) {
  if (!status) return <span className="text-muted-foreground text-xs">Never synced</span>;
  const meta = STATUS_META[status] || STATUS_META.failed;
  const Icon = meta.icon;
  return <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${meta.color}`}><Icon className="h-3 w-3" />{meta.label}</span>;
}

function SourceForm({ initial, leadSources, services, users, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => ({
    name: initial?.name || "", spreadsheetId: initial?.spreadsheet_id || "", sheetName: initial?.sheet_name || "Sheet1",
    defaultLeadSourceId: initial?.default_lead_source_id || "", defaultServiceId: initial?.default_service_id || "",
    defaultAssignedTo: initial?.default_assigned_to || "", frequencyMinutes: initial?.frequency_minutes || 30,
    enabled: initial?.status === "enabled",
    columnMapping: MAPPABLE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: initial?.column_mapping?.[f.key] || "" }), {}),
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setMapping(key, value) { setForm((f) => ({ ...f, columnMapping: { ...f.columnMapping, [key]: value } })); }

  async function save(e) {
    e.preventDefault();
    const missing = MAPPABLE_FIELDS.filter((f) => f.required && !form.columnMapping[f.key].trim());
    if (missing.length) { toast.error(`Map a spreadsheet column for: ${missing.map((f) => f.label).join(", ")}`); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/core/lead-sync/sources/${initial.id}` : "/api/core/lead-sync/sources";
      const res = await apiFetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      toast.success(isEdit ? "Source updated." : "Source created.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <ModalFocusTrap>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${isEdit ? "Edit" : "New"} Sync Source`} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">{isEdit ? "Edit" : "New"} Sync Source</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <input required placeholder="Source name (e.g. Meta Ads — UK Campaign)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          <input required placeholder="Google Spreadsheet ID" value={form.spreadsheetId} onChange={(e) => setForm({ ...form, spreadsheetId: e.target.value })} className={inputClass} />
          <input placeholder="Sheet/Tab name" value={form.sheetName} onChange={(e) => setForm({ ...form, sheetName: e.target.value })} className={inputClass} />

          <div className="grid grid-cols-2 gap-2">
            <select value={form.defaultLeadSourceId} onChange={(e) => setForm({ ...form, defaultLeadSourceId: e.target.value })} className={inputClass}>
              <option value="">Lead source…</option>{leadSources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.defaultServiceId} onChange={(e) => setForm({ ...form, defaultServiceId: e.target.value })} className={inputClass}>
              <option value="">Service…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.defaultAssignedTo} onChange={(e) => setForm({ ...form, defaultAssignedTo: e.target.value })} className={inputClass}>
              <option value="">Default assignee…</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={form.frequencyMinutes} onChange={(e) => setForm({ ...form, frequencyMinutes: Number(e.target.value) })} className={inputClass}>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
            </select>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Column mapping — spreadsheet header → CRM field</p>
            <div className="space-y-1.5">
              {MAPPABLE_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-xs text-foreground truncate">{f.label}{f.required && <span className="text-red-400"> *</span>}</span>
                  <input placeholder="Spreadsheet column header" value={form.columnMapping[f.key]} onChange={(e) => setMapping(f.key, e.target.value)} className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs" />
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Enabled for automatic sync
          </label>
        </div>

        <button type="submit" disabled={saving} className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </form>
      </ModalFocusTrap>
    </div>
  );
}

function HistoryDrawer({ source, timezone, onClose }) {
  const [runs, setRuns] = useState(null);
  useEffect(() => {
    apiFetch(`/api/core/lead-sync/sources/${source.id}/runs`).then((r) => r.json()).then((d) => setRuns(d.runs || [])).catch(() => setRuns([]));
  }, [source.id]);
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <ModalFocusTrap>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Sync History — ${source.name}`} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">Sync History — {source.name}</h2>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        {runs === null ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : runs.length === 0 ? (
          <EmptyState icon={History} title="No sync runs yet" description="Run Sync Now to see results here." />
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="bg-muted/40 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <ResultBadge status={r.status} />
                  <span className="text-muted-foreground text-xs">{formatDateTime(r.started_at, timezone)}</span>
                </div>
                <p className="text-foreground text-xs">Fetched {r.fetched_count} · Created {r.created_count} · Duplicates {r.duplicate_count} · Failed {r.failed_count} · {r.duration_ms ? `${r.duration_ms}ms` : "—"}</p>
                {r.error_report && r.error_report.length > 0 && (
                  <details className="mt-1.5">
                    <summary className="text-red-400 text-[11px] cursor-pointer">View {r.error_report.length} error{r.error_report.length === 1 ? "" : "s"}</summary>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground text-[11px] list-disc list-inside">
                      {r.error_report.map((e, i) => <li key={i}>{e.reason}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </ModalFocusTrap>
    </div>
  );
}

export default function IntegrationsPanel({ sources, leadSources, services, users, timezone, googleConfigured }) {
  const router = useRouter();
  const [formTarget, setFormTarget] = useState(undefined); // undefined = closed, null = new, object = edit
  const [historyTarget, setHistoryTarget] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  function refresh() { setFormTarget(undefined); router.refresh(); }

  async function syncNow(source) {
    setSyncingId(source.id);
    try {
      const res = await apiFetch(`/api/core/lead-sync/sources/${source.id}/sync`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sync failed.");
      toast.success(`Sync complete: ${data.result.created} created, ${data.result.duplicates} duplicates, ${data.result.failed} failed.`);
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSyncingId(null); }
  }

  async function toggleEnabled(source) {
    try {
      const res = await apiFetch(`/api/core/lead-sync/sources/${source.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: source.name, spreadsheetId: source.spreadsheet_id, sheetName: source.sheet_name, columnMapping: source.column_mapping,
          defaultLeadSourceId: source.default_lead_source_id, defaultServiceId: source.default_service_id, defaultAssignedTo: source.default_assigned_to,
          frequencyMinutes: source.frequency_minutes, enabled: source.status !== "enabled",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(source.status === "enabled" ? "Disabled." : "Enabled.");
      router.refresh();
    } catch { toast.error("Failed to update."); }
  }

  return (
    <div>
      {!googleConfigured && (
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Google Sheets is <strong>Not Configured</strong> on this deployment — set <code>GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL</code> and <code>GOOGLE_SHEETS_SERVICE_ACCOUNT_PRIVATE_KEY</code> before "Sync Now" will work. You can still configure sources now.</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-foreground font-medium">Lead Sources / Integrations</p>
        <button onClick={() => setFormTarget(null)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add Source
        </button>
      </div>

      {sources.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No sync sources configured" description="Connect a Google Sheet fed by Meta Ads (or any spreadsheet lead feed) to import leads automatically." />
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-foreground text-sm font-medium">{s.name}</p>
                  <p className="text-muted-foreground text-xs">Meta lead source via Google Sheet · every {s.frequency_minutes}m</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.status === "enabled" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted/20 text-muted-foreground border-border/30"}`}>{s.status}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span>Last sync: {s.last_sync_at ? formatDateTime(s.last_sync_at, timezone) : "Never"}</span>
                <ResultBadge status={s.last_sync_status} />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => syncNow(s)} disabled={syncingId === s.id} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition disabled:opacity-60">
                  {syncingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sync Now
                </button>
                <button onClick={() => setFormTarget(s)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition"><Pencil className="h-3 w-3" /> Configure</button>
                <button onClick={() => setHistoryTarget(s)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-accent text-foreground cursor-pointer transition"><History className="h-3 w-3" /> History</button>
                <button onClick={() => toggleEnabled(s)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer transition"><Power className="h-3 w-3" /> {s.status === "enabled" ? "Disable" : "Enable"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formTarget !== undefined && (
        <SourceForm initial={formTarget} leadSources={leadSources} services={services} users={users} onClose={() => setFormTarget(undefined)} onSaved={refresh} />
      )}
      {historyTarget && <HistoryDrawer source={historyTarget} timezone={timezone} onClose={() => setHistoryTarget(null)} />}
    </div>
  );
}
