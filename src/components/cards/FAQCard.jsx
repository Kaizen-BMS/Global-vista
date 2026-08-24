"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export default function FAQCard({ question, answer, isOpen, onClick }) {
  return (
    <GlassCard hover={false} className="overflow-hidden">
      <button
        onClick={onClick}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 p-6 text-left cursor-pointer"
      >
        <span className="font-display text-lg text-offwhite">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold"
        >
          <Plus className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 text-sm leading-relaxed text-muted">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}