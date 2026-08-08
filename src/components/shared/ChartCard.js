"use client";
import { useState } from "react";
import { Maximize2, X, Download } from "lucide-react";
import { ResponsiveContainer } from "recharts";
import { AnimatePresence, motion } from "framer-motion";

function toCsv(data, columns) {
  const cols = columns || Object.keys(data[0] || {});
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = cols.map(escape).join(",");
  const rows = data.map((row) => cols.map((c) => escape(row[c])).join(","));
  return [header, ...rows].join("\n");
}

function downloadCsv(filename, data, columns) {
  const csv = toCsv(data, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Shared dashboard chart container: compact card + click-to-expand fullscreen
 * modal with a taller render of the same real chart, CSV export of the same
 * real dataset, and (for line/bar callers that opt in via renderChart) a
 * recharts <Brush> for interactive zoom. renderChart receives {fullscreen}
 * so callers can add a Brush / bigger legend only in the modal.
 */
export default function ChartCard({ title, subtitle, empty, emptyLabel, data, csvColumns, renderChart }) {
  const [open, setOpen] = useState(false);
  const hasData = !empty && data && data.length > 0;

  function handleExport() {
    downloadCsv(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, data, csvColumns);
  }

  return (
    <>
      <div className="group relative bg-card border border-border rounded-xl p-5 transition-colors hover:border-muted-foreground/30">
        {hasData && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="Expand chart"
            aria-label={`Expand ${title} chart`}
            className="absolute top-4 right-4 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        <p className="text-foreground font-medium pr-8">{title}</p>
        {subtitle && <p className="text-muted-foreground text-xs mb-1">{subtitle}</p>}
        <div className="h-64 mt-3">
          {empty ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-6">{emptyLabel || "No data yet"}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">{renderChart({ fullscreen: false })}</ResponsiveContainer>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && hasData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              role="dialog" aria-modal="true" aria-label={title}
              className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="min-w-0">
                  <p className="text-foreground font-semibold truncate">{title}</p>
                  {subtitle && <p className="text-muted-foreground text-xs truncate">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="h-[440px]">
                  <ResponsiveContainer width="100%" height="100%">{renderChart({ fullscreen: true })}</ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
