"use client";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const RULES = [
  { key: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "Number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "Special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const LEVELS = [
  { label: "Very weak", color: "#ef4444" },
  { label: "Weak", color: "#f97316" },
  { label: "Fair", color: "#eab308" },
  { label: "Good", color: "#22c55e" },
  { label: "Strong", color: "#10b981" },
];

/** Mirrors the server's checkPasswordComplexity() rules for live feedback — the server remains the actual authority, this is UX only. */
export default function PasswordStrengthMeter({ password }) {
  const passed = RULES.filter((r) => r.test(password || ""));
  const score = password ? passed.length : 0;
  const level = LEVELS[Math.max(0, score - 1)] || LEVELS[0];

  if (!password) return null;

  return (
    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex gap-1 mb-2">
        {RULES.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: level.color }}
              initial={{ width: 0 }}
              animate={{ width: i < score ? "100%" : "0%" }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>
      <p className="text-xs font-medium mb-2" style={{ color: level.color }}>{score > 0 ? level.label : ""}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <div key={r.key} className={`flex items-center gap-1.5 text-[11px] transition-colors ${ok ? "text-emerald-400" : "text-white/35"}`}>
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {r.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
