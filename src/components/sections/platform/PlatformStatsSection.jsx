"use client";
import { motion } from "framer-motion";
import { platformStats } from "@/data/platformLandingData";
import { useCountUp } from "@/hooks/useCountUp";
import { staggerContainer, staggerItem } from "@/animations/staggerContainer";
import GlassCard from "@/components/ui/GlassCard";

function StatItem({ value, suffix, label }) {
  const { ref, value: animated } = useCountUp(value);
  return (
    <motion.div variants={staggerItem} ref={ref}>
      <GlassCard hover={false} className="p-8 text-center">
        <p className="font-display text-4xl text-gold sm:text-5xl">{animated}{suffix}</p>
        <p className="mt-2 text-sm text-muted">{label}</p>
      </GlassCard>
    </motion.div>
  );
}

export default function PlatformStatsSection() {
  return (
    <section className="relative px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <motion.div {...staggerContainer(0.12)} className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {platformStats.map((stat) => <StatItem key={stat.id} {...stat} />)}
        </motion.div>
      </div>
    </section>
  );
}
