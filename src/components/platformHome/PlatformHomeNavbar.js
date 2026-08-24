"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import ThemeToggle from "@/components/shared/ThemeToggle";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const LINKS = [
  { href: "/platform-home#platform", label: "Platform" },
  { href: "/platform-home#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

const BORDER = "border-[#E4E3DE] dark:border-white/10";

export default function PlatformHomeNavbar({ topBar }) {
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

  // Two genuinely different color modes, not a theme concern: at the very
  // top of the page this navbar sits directly on the dark video hero
  // (regardless of whether the site itself is in light or dark theme), so
  // it needs fixed light text there — the same reason the hero's own text
  // is fixed white. Once scrolled past the hero, it sits on the normal
  // page background and switches to real theme-token colors. Using plain
  // conditional class strings here (not `${VAR}` composed with a Tailwind
  // prefix) — that composition pattern is what silently broke the hover
  // states before: Tailwind's build-time scanner needs a class's full name
  // to appear literally in the source, and `hover:${TEXT_PRIMARY}` never
  // does (TEXT_PRIMARY itself contains a space and a second "dark:" class,
  // so the interpolated string splits into two class tokens at runtime —
  // one Tailwind never generated CSS for, and one that applied
  // unconditionally instead of only on hover).
  const linkCls = scrolled
    ? "text-[#5B6270] dark:text-[#8B90A0] hover:text-[#0B0E14] dark:hover:text-[#F4F3EF]"
    : "text-white/75 hover:text-white";
  const brandCls = scrolled ? "text-[#0B0E14] dark:text-[#F4F3EF]" : "text-white";
  const brandSubCls = scrolled ? "text-[#5B6270] dark:text-[#8B90A0]" : "text-white/60";
  const iconCls = scrolled ? "text-[#0B0E14] dark:text-[#F4F3EF]" : "text-white";
  const ctaPrimaryCls = scrolled
    ? "bg-[#0B0E14] text-white hover:bg-indigo-600 dark:bg-[#F4F3EF] dark:text-[#07080B] dark:hover:bg-indigo-400"
    : "bg-white text-[#07080B] hover:bg-indigo-400 hover:text-white";

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
      className={`fixed top-0 inset-x-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${
        scrolled ? `${BORDER} bg-[#FAFAF7]/90 dark:bg-[#07080B]/90` : "border-white/10 bg-black/10"
      }`}
    >
      {topBar}
      <div className={`max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between transition-all duration-300 ${scrolled ? "h-14" : "h-18"}`}>
        <Link href="/platform-home" className="flex items-center gap-2.5 cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GLOBAL_VISTA_BRANDING.logoUrl} alt={GLOBAL_VISTA_BRANDING.name} className="h-10 sm:h-12 w-auto object-contain" />
          <span className={`font-medium text-sm tracking-tight transition-colors duration-300 ${brandCls}`}>KaizenBMS <span className={`transition-colors duration-300 ${brandSubCls}`}>Platform</span></span>
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={`relative text-sm transition-colors duration-300 cursor-pointer group ${linkCls}`}>
              {l.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-current transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <span className={`transition-colors duration-300 ${iconCls}`}><ThemeToggle /></span>
          <Link href="/login" className={`text-sm transition-colors duration-300 cursor-pointer ${linkCls}`}>Login</Link>
          <Link href="/register" className={`group flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 cursor-pointer ${ctaPrimaryCls}`}>
            Start Free <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="flex items-center gap-4 lg:hidden">
          <span className={`transition-colors duration-300 ${iconCls}`}><ThemeToggle /></span>
          <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className={`cursor-pointer transition-colors duration-300 ${iconCls}`}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 top-0">
          <div className="fixed inset-0 bg-black/20 dark:bg-black/50" onClick={() => setOpen(false)} />
          <ModalFocusTrap>
          <motion.div
            role="dialog" aria-modal="true" aria-label="Navigation"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className={`relative border-b ${BORDER} bg-[#FAFAF7] dark:bg-[#07080B] px-6 py-6 space-y-1`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-sm text-[#0B0E14] dark:text-[#F4F3EF]">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="cursor-pointer text-[#5B6270] dark:text-[#8B90A0] hover:text-[#0B0E14] dark:hover:text-[#F4F3EF]"><X className="h-5 w-5" /></button>
            </div>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-base py-2.5 text-[#0B0E14] dark:text-[#F4F3EF] cursor-pointer">{l.label}</a>
            ))}
            <div className={`flex flex-col gap-2 pt-4 mt-2 border-t ${BORDER}`}>
              <Link href="/login" className={`text-center py-3 rounded-md border ${BORDER} text-sm text-[#0B0E14] dark:text-[#F4F3EF] cursor-pointer`}>Login</Link>
              <Link href="/register" className="text-center py-3 rounded-md bg-[#0B0E14] dark:bg-[#F4F3EF] text-white dark:text-[#07080B] text-sm font-medium cursor-pointer">Start Free</Link>
            </div>
          </motion.div>
          </ModalFocusTrap>
        </div>
      )}
    </motion.header>
  );
}
