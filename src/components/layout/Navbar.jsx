    "use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Globe2 } from "lucide-react";
import { useScrolled } from "@/hooks/useScrolled";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Image from "next/image";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact Us" },
];

export default function Navbar() {
  const scrolled = useScrolled(24);
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "border-b border-white/10 bg-navy/70 backdrop-blur-xl py-3"
          : "bg-transparent py-5"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-10">
      

<Link href="/" className="flex items-center gap-4 group">
  {/* Logo Container */}
  <div
    className="
      relative
      h-16 w-16
      lg:h-20 lg:w-20
      overflow-hidden
      rounded-full
      border border-[#D89B1D]/40
      bg-gradient-to-br
      from-[#0A1330]
      to-[#111C48]
      shadow-[0_0_20px_rgba(216,155,29,0.25)]
      transition-all
      duration-300
      group-hover:scale-105
      group-hover:shadow-[0_0_35px_rgba(216,155,29,0.45)]
    "
  >
    <Image
      src="/images/logo.png"
      alt="Global Vista Educators Logo"
      fill
      priority
      className="object-contain p-0"
    />
  </div>

  {/* Text */}
  <div className="flex flex-col leading-none">
    <span className="font-display text-2xl font-semibold text-white tracking-wide">
      Global Vista
    </span>

    <span className="mt-1 text-sm lg:text-base font-medium tracking-[0.35em] uppercase text-[#D89B1D]">
      EDUCATORS
    </span>

    <span className="mt-2 hidden xl:block text-[10px] tracking-[0.4em] uppercase text-white/70">
      EXPLORE • EDUCATE • EMPOWER
    </span>
  </div>
</Link>
        <div className="hidden items-center gap-8 xl:gap-10 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm text-muted transition-colors hover:text-offwhite after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/platform-home"
            className="group flex items-center gap-2 rounded-full border border-[#D89B1D]/20 px-4 py-2 text-xs text-muted transition-all duration-300 hover:border-[#D89B1D] hover:bg-[#D89B1D]/10 hover:text-[#D89B1D]"
          >
            <Globe2 className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-12" />
            <span>KaizenBMS Platform</span>
          </Link>
          <Button as="a" href="/contact" variant="primary" className="text-xs">
            Book Consultation
          </Button>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-offwhite lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/10 bg-navy/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base text-muted transition-colors hover:bg-white/5 hover:text-offwhite"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/platform-home"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-[#D89B1D]/20 px-3 py-3 text-sm text-muted transition-colors hover:border-[#D89B1D] hover:bg-[#D89B1D]/10 hover:text-[#D89B1D]"
              >
                <Globe2 className="h-4 w-4" />
                <span>KaizenBMS Platform</span>
              </Link>
              <Button
                as="a"
                href="/contact"
                variant="primary"
                className="mt-3 w-full"
                onClick={() => setOpen(false)}
              >
                Book Consultation
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}