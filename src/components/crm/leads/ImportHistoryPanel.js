"use client";
import { useState, useEffect } from "react";
import { Download, FileText, ChevronDown } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { SkeletonRows } from "@/components/shared/Skeleton";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

export default function ImportHistoryPanel() {
  const timezone = useTimezone();
  const [history, setHistory] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && !history) {
      apiFetch("/api/leads/import/history").then((r) => r.json()).then((d) => setHistory(d.history || [])).catch(() => setHistory([]));
    }
  }, [open, history]);

  return (
    <div className="mt-10 border-t border-border pt-6">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition">
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} /> Import History
      </button>
      {open && (
        <div className="mt-4 bg-card border border-border rounded-xl overflow-hidden">
          {!history ? (
            <SkeletonRows rows={3} className="p-4" />
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No imports yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="px-4 py-3">Date</th><th className="px-4 py-3">File</th><th className="px-4 py-3">By</th><th className="px-4 py-3">Imported</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Skipped</th><th className="px-4 py-3">Failed</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3"></th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-border/60">
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(h.created_at, timezone)}</td>
                      <td className="px-4 py-3 text-foreground truncate max-w-[160px]">{h.file_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.imported_by_name || "—"}</td>
                      <td className="px-4 py-3 text-emerald-400">{h.imported_count}</td>
                      <td className="px-4 py-3 text-indigo-400">{h.updated_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.skipped_count}</td>
                      <td className="px-4 py-3 text-red-400">{h.failed_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.duration_ms ? `${(h.duration_ms / 1000).toFixed(1)}s` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {h.failed_count > 0 && (
                            <a href={`/api/leads/import/history/${h.id}/failed-rows?format=xlsx`} title="Download failed rows" aria-label="Download failed rows" className="text-muted-foreground hover:text-foreground cursor-pointer"><Download className="h-3.5 w-3.5" /></a>
                          )}
                          <a href={`/api/leads/import/history/${h.id}/log`} title="Download log" aria-label="Download import log" className="text-muted-foreground hover:text-foreground cursor-pointer"><FileText className="h-3.5 w-3.5" /></a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
