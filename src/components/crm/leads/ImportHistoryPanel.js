"use client";
import { useState, useEffect } from "react";
import { Download, FileText, ChevronDown } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { SkeletonRows } from "@/components/shared/Skeleton";

export default function ImportHistoryPanel() {
  const [history, setHistory] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && !history) {
      apiFetch("/api/leads/import/history").then((r) => r.json()).then((d) => setHistory(d.history || [])).catch(() => setHistory([]));
    }
  }, [open, history]);

  return (
    <div className="mt-10 border-t border-neutral-800 pt-6">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white cursor-pointer transition">
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} /> Import History
      </button>
      {open && (
        <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          {!history ? (
            <SkeletonRows rows={3} className="p-4" />
          ) : history.length === 0 ? (
            <p className="text-neutral-600 text-sm text-center py-8">No imports yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="px-4 py-3">Date</th><th className="px-4 py-3">File</th><th className="px-4 py-3">By</th><th className="px-4 py-3">Imported</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Skipped</th><th className="px-4 py-3">Failed</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3"></th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-neutral-800/60">
                    <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-white truncate max-w-[160px]">{h.file_name}</td>
                    <td className="px-4 py-3 text-neutral-400">{h.imported_by_name || "—"}</td>
                    <td className="px-4 py-3 text-emerald-400">{h.imported_count}</td>
                    <td className="px-4 py-3 text-indigo-400">{h.updated_count}</td>
                    <td className="px-4 py-3 text-neutral-400">{h.skipped_count}</td>
                    <td className="px-4 py-3 text-red-400">{h.failed_count}</td>
                    <td className="px-4 py-3 text-neutral-500">{h.duration_ms ? `${(h.duration_ms / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {h.failed_count > 0 && (
                          <a href={`/api/leads/import/history/${h.id}/failed-rows?format=xlsx`} title="Download failed rows" className="text-neutral-500 hover:text-white cursor-pointer"><Download className="h-3.5 w-3.5" /></a>
                        )}
                        <a href={`/api/leads/import/history/${h.id}/log`} title="Download log" className="text-neutral-500 hover:text-white cursor-pointer"><FileText className="h-3.5 w-3.5" /></a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
