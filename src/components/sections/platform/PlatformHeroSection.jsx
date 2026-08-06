"use client";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, LayoutDashboard } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { fadeUp } from "@/animations/fadeUp";

const PILLS = [
  { icon: ShieldCheck, label: "Multi-tenant & isolated" },
  { icon: Zap, label: "Real-time notifications" },
  { icon: LayoutDashboard, label: "Live dashboards" },
];

export default function PlatformHeroSection() {
  return (
    <section className="relative overflow-hidden pt-10 pb-24 lg:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gold/10 blur-[140px]" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-[#4f46e5]/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center lg:px-10">
        <motion.div {...fadeUp(0)}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-gold backdrop-blur-md">
            The Global Vista Platform
          </span>
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="mt-8 font-display text-4xl leading-[1.08] text-offwhite sm:text-5xl lg:text-6xl">
          One workspace to run your
          <br /><span className="text-gold">entire operation.</span>
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-300">
          CRM, HR, reporting, and automation in a single multi-tenant platform —
          branded as your own, secured per company, and built to scale with your team.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="mt-10 flex flex-wrap justify-center gap-4">
          <Button as="a" href="/login" variant="primary">
            Sign In to Your Workspace <ArrowRight className="h-4 w-4" />
          </Button>
          <Button as="a" href="#features" variant="outline">
            Explore the Platform
          </Button>
        </motion.div>

        <motion.div {...fadeUp(0.42)} className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {PILLS.map((p) => (
            <GlassCard key={p.label} hover={false} className="flex items-center justify-center gap-2.5 px-4 py-3.5">
              <p.icon className="h-4 w-4 text-gold shrink-0" />
              <span className="text-sm text-offwhite/90">{p.label}</span>
            </GlassCard>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
