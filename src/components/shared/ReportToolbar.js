"use client";
import { Download, Printer } from "lucide-react";

export default function ReportToolbar({ exportBase, title }) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <a href={`${exportBase}?format=xlsx`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground/80 hover:text-foreground text-sm transition cursor-pointer">
        <Download className="h-4 w-4" /> Excel
      </a>
      <a href={`${exportBase}?format=csv`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground/80 hover:text-foreground text-sm transition cursor-pointer">
        <Download className="h-4 w-4" /> CSV
      </a>
      <button
        onClick={() => window.print()}
        title="PDF export is not available yet — this opens your browser's print dialog, which can Save as PDF as a workaround. A dedicated PDF export needs a library (e.g. jsPDF) that isn't installed."
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground/80 hover:text-foreground text-sm transition cursor-pointer"
      >
        <Printer className="h-4 w-4" /> Print / PDF
      </button>
    </div>
  );
}
