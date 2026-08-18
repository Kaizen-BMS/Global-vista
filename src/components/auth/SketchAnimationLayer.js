"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * An original, hand-drawn-style annotation layer for the right-side product
 * panel — thin, slightly imperfect strokes in the loop of a designer's
 * marker sketch (inspired by the "hand-drawn annotation" style modern SaaS
 * product illustrations use), not literal icons and not anyone's copyrighted
 * artwork. Every path below was drawn freehand for this component.
 *
 * Purely decorative: `pointer-events-none` throughout, absolutely positioned
 * within the parent's corners, and hidden below `lg` so it never competes
 * for space with the floating cards on a stacked mobile/tablet layout.
 */

function Sparkle({ className, color, delay = 0, size = 26, reduce }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <motion.path
        d="M10 0 C11 6 14 9 20 10 C14 11 11 14 10 20 C9 14 6 11 0 10 C6 9 9 6 10 0 Z"
        fill={color}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={reduce ? { opacity: 0.8, scale: 1 } : { opacity: [0, 0.9, 0.9, 0], scale: [0.4, 1, 1, 0.7] }}
        transition={reduce ? { duration: 0.6, delay } : { duration: 3.6, repeat: Infinity, times: [0, 0.25, 0.7, 1], delay, ease: "easeInOut" }}
        style={{ transformOrigin: "10px 10px" }}
      />
    </svg>
  );
}

function RoughCircle({ className, color, size = 72, delay = 0, reduce }) {
  return (
    <svg width={size} height={size} viewBox="0 0 76 68" fill="none" className={className}>
      <motion.path
        d="M40 5 C60 5 70 20 68 38 C66 55 50 66 32 63 C15 60 5 45 8 28 C10 14 22 5 40 5"
        stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={reduce ? { pathLength: 1, opacity: 0.55 } : { pathLength: 1, opacity: [0, 0.6, 0.4, 0.6] }}
        transition={reduce ? { duration: 0.8, delay } : { pathLength: { duration: 1.6, delay, ease: "easeInOut" }, opacity: { duration: 5, delay, repeat: Infinity, ease: "easeInOut" } }}
      />
    </svg>
  );
}

function SketchArrow({ className, color, width = 90, delay = 0, reduce, curve = "M2 34 C 24 10 55 6 86 16" }) {
  return (
    <svg width={width} height="40" viewBox="0 0 90 40" fill="none" className={className}>
      <motion.path
        d={curve}
        stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: reduce ? 0.6 : [0, 0.7, 0.7, 0.7] }}
        transition={reduce ? { duration: 0.8, delay } : { pathLength: { duration: 1.4, delay, ease: "easeInOut" }, opacity: { duration: 1.4, delay, ease: "easeInOut" } }}
      />
      <motion.path
        d="M74 8 L86 16 L75 24"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: reduce ? 0.6 : 0.7 }}
        transition={{ duration: 0.5, delay: delay + (reduce ? 0 : 1.2) }}
      />
    </svg>
  );
}

function SketchChart({ className, color, accent, delay = 0, reduce }) {
  const bars = [14, 24, 18, 32];
  return (
    <svg width="64" height="44" viewBox="0 0 64 44" fill="none" className={className}>
      <motion.path
        d="M2 40 C 20 42 45 41 62 40" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.4}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay }}
      />
      {bars.map((h, i) => (
        <motion.rect
          key={i} x={6 + i * 15} y={40 - h} width="8" rx="2" fill={i === bars.length - 1 ? accent : color}
          initial={{ height: 0, y: 40, opacity: 0 }}
          animate={{ height: h, y: 40 - h, opacity: reduce ? 0.7 : 0.75 }}
          transition={{ duration: 0.6, delay: delay + i * 0.12, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}

function SketchCheckBox({ className, color, delay = 0, reduce }) {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" className={className}>
      <motion.rect
        x="3" y="4" width="40" height="38" rx="9" stroke={color} strokeWidth="2" fill="none"
        transform="rotate(-2 23 23)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: reduce ? 0.55 : 0.6 }}
        transition={{ duration: 1, delay, ease: "easeInOut" }}
      />
      <motion.path
        d="M13 23 L20 30 L34 14" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: reduce ? 0.9 : [0, 1, 1] }}
        transition={{ duration: 0.6, delay: delay + 0.6 }}
      />
    </svg>
  );
}

function Underline({ className, color, delay = 0, reduce }) {
  return (
    <svg width="70" height="14" viewBox="0 0 70 14" fill="none" className={className}>
      <motion.path
        d="M2 8 Q 18 2 35 7 T 68 6" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: reduce ? 0.5 : 0.55 }}
        transition={{ duration: 1, delay, ease: "easeInOut" }}
      />
    </svg>
  );
}

export default function SketchAnimationLayer({ primary, accent }) {
  const prefersReduced = useReducedMotion();
  const white = "rgba(255,255,255,0.55)";

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] hidden lg:block">
      {/* Top-left — sparkle + short underline, echoing the headline chip above it */}
      <div className="absolute left-[8%] top-[12%] flex flex-col items-start gap-2">
        <Sparkle color={accent} delay={0.6} reduce={prefersReduced} />
        <Underline className="ml-1" color={white} delay={1.1} reduce={prefersReduced} />
      </div>

      {/* Top-right — rough circle with an arrow curling toward the headline */}
      <div className="absolute right-[10%] top-[16%]">
        <RoughCircle color={primary} delay={0.8} reduce={prefersReduced} />
        <SketchArrow
          className="absolute -left-14 top-14 -scale-x-100"
          color={white} delay={1.6} reduce={prefersReduced}
          curve="M2 4 C 24 8 55 20 86 32"
        />
      </div>

      {/* Bottom-left — small analytics sketch with a growth arrow */}
      <div className="absolute bottom-[14%] left-[9%] flex items-end gap-1.5">
        <SketchChart color={white} accent={accent} delay={1.2} reduce={prefersReduced} />
        <SketchArrow width={54} className="mb-6" color={accent} delay={1.9} reduce={prefersReduced} curve="M2 30 C 16 18 34 10 52 4" />
      </div>

      {/* Bottom-right — hand-drawn check-box, the "task done" annotation */}
      <div className="absolute bottom-[12%] right-[9%]">
        <SketchCheckBox color={primary} delay={1.4} reduce={prefersReduced} />
      </div>
    </div>
  );
}
