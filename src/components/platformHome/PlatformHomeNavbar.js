"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import ThemeToggle from "@/components/shared/ThemeToggle";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#pricing", label: "Pricing" },
];

const TEXT_PRIMARY = "text-[#0B0E14] dark:text-[#F4F3EF]";
const TEXT_SECONDARY = "text-[#5B6270] dark:text-[#8B90A0]";
const BORDER = "border-[#E4E3DE] dark:border-white/10";

export default function PlatformHomeNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 24); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
      className={`fixed top-0 inset-x-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${BORDER} ${scrolled ? "bg-[#FAFAF7]/90 dark:bg-[#07080B]/90" : "bg-[#FAFAF7]/40 dark:bg-[#07080B]/40"}`}
    >
      <div className={`max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between transition-all duration-300 ${scrolled ? "h-14" : "h-18"}`}>
        <Link href="/platform-home" className="flex items-center gap-2.5 cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GLOBAL_VISTA_BRANDING.logoUrl} alt={GLOBAL_VISTA_BRANDING.name} className="h-10 sm:h-12 w-auto object-contain" />
          <span className={`font-medium text-sm tracking-tight ${TEXT_PRIMARY}`}>KaizenBMS <span className={TEXT_SECONDARY}>Platform</span></span>
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={`relative text-sm ${TEXT_SECONDARY} hover:${TEXT_PRIMARY} transition-colors cursor-pointer group`}>
              {l.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-current transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <ThemeToggle />
          <Link href="/login" className={`text-sm ${TEXT_SECONDARY} hover:${TEXT_PRIMARY} transition-colors cursor-pointer`}>Login</Link>
          <Link href="/register" className={`group flex items-center gap-2 px-4 py-2 text-sm font-medium border ${TEXT_PRIMARY} border-current hover:bg-[#0B0E14] hover:text-white dark:hover:bg-[#F4F3EF] dark:hover:text-[#07080B] transition-colors cursor-pointer`}>
            Start Free <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="flex items-center gap-4 lg:hidden">
          <ThemeToggle />
          <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className={`cursor-pointer ${TEXT_PRIMARY}`}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className={`lg:hidden fixed inset-0 top-0 ${scrolled ? "" : ""}`}>
          <div className={`fixed inset-0 bg-black/20 dark:bg-black/50`} onClick={() => setOpen(false)} />
          <ModalFocusTrap>
          <motion.div
            role="dialog" aria-modal="true" aria-label="Navigation"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className={`relative border-b ${BORDER} bg-[#FAFAF7] dark:bg-[#07080B] px-6 py-6 space-y-1`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`font-medium text-sm ${TEXT_PRIMARY}`}>Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className={`cursor-pointer ${TEXT_SECONDARY} hover:${TEXT_PRIMARY}`}><X className="h-5 w-5" /></button>
            </div>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={`block text-base py-2.5 ${TEXT_PRIMARY} cursor-pointer`}>{l.label}</a>
            ))}
            <div className={`flex flex-col gap-2 pt-4 mt-2 border-t ${BORDER}`}>
              <Link href="/login" className={`text-center py-3 border ${BORDER} text-sm ${TEXT_PRIMARY} cursor-pointer`}>Login</Link>
              <Link href="/register" className={`text-center py-3 border ${TEXT_PRIMARY} border-current text-sm font-medium cursor-pointer`}>Start Free</Link>
            </div>
          </motion.div>
          </ModalFocusTrap>
        </div>
      )}
    </motion.header>
  );
}
