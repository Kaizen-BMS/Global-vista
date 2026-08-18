"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import AuthShowcase from "@/components/auth/AuthShowcase";
import AuthSwapButton from "@/components/auth/AuthSwapButton";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";

const SPRING = { type: "spring", stiffness: 260, damping: 30 };

export default function AuthShell({ children, branding = GLOBAL_VISTA_BRANDING, maxWidth = "max-w-sm", swapEnabled = true }) {
  // Deterministic, client-only state — never derived from window/Date/Math
  // during render, so the server-rendered markup (always "not swapped")
  // matches the client's first paint exactly; only a click ever changes it.
  const [swapped, setSwapped] = useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#05050c]">
      <motion.div
        layout
        transition={SPRING}
        style={{ order: swapped ? 2 : 0 }}
        className="flex flex-1 lg:flex-none lg:w-[38%] xl:w-[36%] min-w-0 items-center justify-center px-6 py-10 sm:px-10"
      >
        <motion.div
          layout="position"
          transition={SPRING}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full ${maxWidth}`}
        >
          {/* Shared by both Login and Register (this component) — the
              platform identity here links back to the KaizenBMS Platform
              marketing site, not a dead-end static logo. */}
          <AuthBrandPanel branding={branding} />
          {children}
        </motion.div>
      </motion.div>

      {swapEnabled && (
        <AuthSwapButton
          swapped={swapped}
          onClick={() => setSwapped((s) => !s)}
          label={swapped ? "Switch layout back" : "Switch layout"}
        />
      )}

      <motion.div layout transition={SPRING} style={{ order: swapped ? 0 : 2 }} className="flex-1 min-w-0">
        <AuthShowcase branding={branding} />
      </motion.div>
    </div>
  );
}
