"use client";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { fadeUp } from "@/animations/fadeUp";
import { staggerContainer, staggerItem } from "@/animations/staggerContainer";
import { platformPricingTiers } from "@/data/platformLandingData";

const COMMON = ["Multi-tenant workspace", "Role-based access control", "Email support"];

export default function PlatformPricingSection() {
  return (
    <section className="relative px-6 py-24 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp(0)} className="text-center">
          <SectionLabel className="justify-center">Pricing</SectionLabel>
          <h2 className="mt-4 font-display text-3xl text-offwhite sm:text-4xl">Plans that grow with your team</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted">Every plan includes the full platform, isolated per company. Talk to us for a quote tailored to your team size and modules.</p>
        </motion.div>

        <motion.div {...staggerContainer(0.1)} className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {platformPricingTiers.map((tier) => (
            <motion.div key={tier.id} variants={staggerItem}>
              <GlassCard hover={false} className={`relative flex h-full flex-col p-8 ${tier.highlight ? "border-gold/50 bg-gold/[0.06]" : ""}`}>
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy">Most Popular</span>
                )}
                <h3 className="font-display text-xl text-offwhite">{tier.name}</h3>
                <p className="mt-2 text-sm text-muted">{tier.tagline}</p>
                <p className="mt-6 font-display text-3xl text-gold">Custom</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {COMMON.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-offwhite/85">
                      <Check className="h-4 w-4 shrink-0 text-gold" /> {f}
                    </li>
                  ))}
                </ul>
                <Button as="a" href="/contact" variant={tier.highlight ? "primary" : "outline"} className="mt-8 w-full justify-center">
                  Talk to Us <ArrowRight className="h-4 w-4" />
                </Button>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
