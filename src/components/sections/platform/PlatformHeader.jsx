"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";

export default function PlatformHeader() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-11 w-11 overflow-hidden rounded-full border border-gold/40 bg-gradient-to-br from-[#0A1330] to-[#111C48] shadow-[0_0_20px_rgba(216,155,29,0.25)] transition-all duration-300 group-hover:scale-105">
            <Image src="/images/logo.png" alt="Global Vista" fill priority className="object-contain" />
          </div>
          <div className="leading-none">
            <p className="font-display text-lg text-offwhite">Global Vista</p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold">Platform</p>
          </div>
        </Link>

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Button as="a" href="/login" variant="primary" className="text-xs">
            Sign In <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      </div>
    </header>
  );
}
