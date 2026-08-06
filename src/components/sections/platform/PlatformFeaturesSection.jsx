"use client";
import { motion } from "framer-motion";
import { Contact2, Users, GraduationCap, FileText, BarChart3, Workflow, Bell, Sparkles } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import GlassCard from "@/components/ui/GlassCard";
import { fadeUp } from "@/animations/fadeUp";
import { staggerContainer, staggerItem } from "@/animations/staggerContainer";
import { platformFeatures } from "@/data/platformLandingData";

const ICONS = { Contact2, Users, GraduationCap, FileText, BarChart3, Workflow, Bell, Sparkles };

export default function PlatformFeaturesSection() {
  return (
    <section id="features" className="relative px-6 py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp(0)} className="text-center">
          <SectionLabel className="justify-center">Everything, Connected</SectionLabel>
          <h2 className="mt-4 font-display text-3xl text-offwhite sm:text-4xl">A platform, not a patchwork of tools</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted">Every module shares the same tenant, the same permissions, and the same data — nothing to sync, nothing to reconcile.</p>
        </motion.div>

        <motion.div {...staggerContainer(0.08)} className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {platformFeatures.map((f) => {
            const Icon = ICONS[f.icon];
            return (
              <motion.div key={f.id} variants={staggerItem}>
                <GlassCard className="h-full p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/10">
                    <Icon className="h-5.5 w-5.5 text-gold" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 font-display text-lg text-offwhite">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.description}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
