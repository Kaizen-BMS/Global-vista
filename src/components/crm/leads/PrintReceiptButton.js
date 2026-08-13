"use client";
import { Printer } from "lucide-react";

/** window.print() lets the browser's own "Save as PDF" destination handle
 * Download — no new PDF-generation dependency needed for a one-page receipt. */
export default function PrintReceiptButton() {
  return (
    <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 px-4 py-2 rounded-lg btn-brand text-white text-sm font-medium cursor-pointer">
      <Printer className="h-4 w-4" /> Print / Download PDF
    </button>
  );
}
