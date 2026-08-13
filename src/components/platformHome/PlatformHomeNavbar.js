"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";

const LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Solutions" },
  { href: "#pricing", label: "Pricing" },
];

export default function PlatformHomeNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
      className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#05060f]/80 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/platform-home" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GLOBAL_VISTA_BRANDING.logoUrl} alt={GLOBAL_VISTA_BRANDING.name} className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-white font-semibold text-sm tracking-tight">KaizenBMS <span className="text-white/40 font-normal">Platform</span></span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-white/60 hover:text-white text-sm transition-colors">{l.label}</a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login" className="text-white/70 hover:text-white text-sm px-3 py-2 transition-colors">Login</Link>
          <Link href="/register" className="group flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            Start Free Trial <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button onClick={() => setOpen((o) => !o)} className="lg:hidden text-white cursor-pointer"><Menu className="h-6 w-6" /></button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="lg:hidden border-t border-white/10 bg-[#05060f] px-5 py-4 space-y-3">
          <div className="flex justify-end"><button onClick={() => setOpen(false)} className="text-white/60 cursor-pointer"><X className="h-5 w-5" /></button></div>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-white/70 text-sm py-1.5">{l.label}</a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/login" className="text-center py-2.5 rounded-lg border border-white/10 text-white text-sm">Login</Link>
            <Link href="/register" className="text-center py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium">Start Free Trial</Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
