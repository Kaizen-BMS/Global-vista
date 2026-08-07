"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Minimal hover tooltip for the collapsed sidebar — icon-only items still need a way to show their label. */
export default function SidebarTooltip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs shadow-xl pointer-events-none"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
