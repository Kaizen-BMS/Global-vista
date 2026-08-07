"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Contact2, BarChart3, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";
import { useMousePosition } from "@/hooks/useMousePosition";

function useParallax(strength = 1) {
  const { x, y } = useMousePosition();
  return useMemo(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    return { x: ((x - cx) / cx) * strength, y: ((y - cy) / cy) * strength };
  }, [x, y, strength]);
}

function FloatingCard({ children, className, delay = 0, floatDuration = 5, parallaxStrength = 6 }) {
  const parallax = useParallax(parallaxStrength);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{
        opacity: 1, scale: 1,
        y: [0, -10, 0],
        x: parallax.x, translateY: parallax.y,
      }}
      transition={{
        opacity: { duration: 0.6, delay }, scale: { duration: 0.6, delay },
        y: { duration: floatDuration, repeat: Infinity, ease: "easeInOut", delay },
        x: { type: "spring", stiffness: 40, damping: 15 },
        translateY: { type: "spring", stiffness: 40, damping: 15 },
      }}
      className={`absolute rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function AuthShowcase({ branding }) {
  const accent = branding?.accentColor || "#22d3ee";
  const primary = branding?.primaryColor || "#4f46e5";

  return (
    <div className="relative hidden lg:flex flex-1 items-center justify-center overflow-hidden bg-[#05050c]">
      {/* Gradient base + animated blobs */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 20%, ${primary}33 0%, transparent 55%), radial-gradient(circle at 75% 75%, ${accent}22 0%, transparent 50%)` }} />
      <motion.div
        className="absolute -top-32 -left-20 h-96 w-96 rounded-full blur-[110px]"
        style={{ backgroundColor: `${primary}55` }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full blur-[130px]"
        style={{ backgroundColor: `${accent}33` }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Noise/vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_55%,#05050c_100%)]" />

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative z-10 max-w-md text-center px-8 -translate-y-40"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
          One workspace, everything connected
        </span>
        <h2 className="mt-6 text-2xl font-semibold text-white leading-snug">
          CRM, reporting, and automation —<br />built for teams that move fast.
        </h2>
      </motion.div>

      {/* Floating preview cards */}
      <div className="relative z-10 h-[420px] w-[520px]">
        <FloatingCard className="left-2 top-6 w-56 p-4" delay={0.1} floatDuration={5.5}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primary}30` }}>
              <LayoutDashboard className="h-3.5 w-3.5" style={{ color: primary }} />
            </div>
            <p className="text-white text-xs font-medium">Dashboard</p>
          </div>
          <p className="text-white text-xl font-semibold">128</p>
          <p className="text-emerald-400 text-[11px] flex items-center gap-1 mt-0.5"><TrendingUp className="h-3 w-3" /> +18% this month</p>
        </FloatingCard>

        <FloatingCard className="right-4 top-0 w-48 p-4" delay={0.3} floatDuration={6.5}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}30` }}>
              <Contact2 className="h-3.5 w-3.5" style={{ color: accent }} />
            </div>
            <p className="text-white text-xs font-medium">Pipeline</p>
          </div>
          <div className="space-y-1.5">
            {[65, 40, 85].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: primary }} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 1, delay: 0.5 + i * 0.15 }} />
              </div>
            ))}
          </div>
        </FloatingCard>

        <FloatingCard className="left-16 bottom-4 w-60 p-4" delay={0.5} floatDuration={5}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-emerald-500/20">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-white text-xs font-medium">Analytics</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-12">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <motion.div key={i} className="flex-1 rounded-t-sm" style={{ backgroundColor: i === 5 ? accent : `${primary}90` }} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.6, delay: 0.6 + i * 0.05 }} />
            ))}
          </div>
        </FloatingCard>

        <FloatingCard className="right-0 bottom-16 w-52 p-4" delay={0.7} floatDuration={7}>
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accent}30`, boxShadow: `0 0 16px ${accent}66` }}
              animate={{ boxShadow: [`0 0 8px ${accent}44`, `0 0 20px ${accent}88`, `0 0 8px ${accent}44`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
            </motion.div>
            <p className="text-white text-xs font-medium">AI Assistant</p>
          </div>
          <p className="text-white/60 text-[11px] leading-relaxed">Computed lead scoring, ready as a foundation for more.</p>
        </FloatingCard>

        <FloatingCard className="left-1/2 -translate-x-1/2 top-40 w-44 p-3.5 flex items-center gap-2" delay={0.9} floatDuration={6}>
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-white/80 text-[11px]">Lead assigned & follow-up scheduled</p>
        </FloatingCard>
      </div>
    </div>
  );
}
