"use client";
import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";
import TestimonialCard from "@/components/cards/TestimonialCard";
import { platformTestimonials } from "@/data/platformLandingData";
import { fadeUp } from "@/animations/fadeUp";
import { staggerContainer, staggerItem } from "@/animations/staggerContainer";

export default function PlatformTestimonialsSection() {
  return (
    <section className="relative px-6 py-24 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp(0)} className="text-center">
          <SectionLabel className="justify-center">Teams on the Platform</SectionLabel>
          <h2 className="mt-4 font-display text-3xl text-offwhite sm:text-4xl">Built for teams that live in their pipeline</h2>
        </motion.div>

        <motion.div {...staggerContainer(0.12)} className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {platformTestimonials.map((t) => (
            <motion.div key={t.id} variants={staggerItem}>
              <TestimonialCard {...t} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
