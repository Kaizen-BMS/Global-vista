"use client";
import { motion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";

/**
 * The seam control between the form and showcase panels. Positioned via
 * CSS `order` in AuthShell (always order:1, strictly between the panels'
 * 0/2 order values) rather than absolute positioning — that way it stays
 * correctly centered in BOTH the mobile (stacked, column) and desktop
 * (side-by-side, row) layouts with zero JS layout math.
 */
export default function AuthSwapButton({ swapped, onClick, label = "Switch layout" }) {
  return (
    <div className="flex lg:flex-col items-center justify-center gap-3 py-3 lg:py-0 lg:px-3 shrink-0" style={{ order: 1 }}>
      <div className="h-px flex-1 lg:h-auto lg:flex-1 lg:w-px bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        whileHover={{ scale: 1.08, boxShadow: "0 0 0 1px rgba(129,140,248,0.4), 0 0 24px rgba(99,102,241,0.55)" }}
        whileTap={{ scale: 0.94 }}
        className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-lg cursor-pointer transition-colors duration-300 hover:border-indigo-400/50 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05050c]"
      >
        <motion.span
          animate={{ rotate: swapped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex items-center justify-center"
        >
          <ArrowLeftRight className="h-4 w-4 text-white/70 transition-colors group-hover:text-white" />
        </motion.span>
        <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0a0a14] px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          {label}
        </span>
      </motion.button>
      <div className="h-px flex-1 lg:h-auto lg:flex-1 lg:w-px bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-white/10 to-transparent" />
    </div>
  );
}
