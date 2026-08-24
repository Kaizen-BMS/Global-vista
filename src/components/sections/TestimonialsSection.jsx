"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import TestimonialCard from "@/components/cards/TestimonialCard";
import { testimonialsData } from "@/data/testimonialsData";
import { fadeUp } from "@/animations/fadeUp";

export default function TestimonialsSection() {
  const [index, setIndex] = useState(0);

  const next = () => setIndex((i) => (i + 1) % testimonialsData.length);
  const prev = () =>
    setIndex((i) => (i - 1 + testimonialsData.length) % testimonialsData.length);

  return (
    <section className="relative px-6 py-24 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp(0)} className="text-center">
          <SectionLabel className="justify-center">Testimonials</SectionLabel>
          <h2 className="mt-4 font-display text-3xl text-offwhite sm:text-4xl">
            Families who trust the journey
          </h2>
        </motion.div>

        <div className="relative mt-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialsData[index].id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <TestimonialCard {...testimonialsData[index]} />
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              aria-label="Previous testimonial"
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-offwhite transition-colors hover:border-gold/40 hover:text-gold cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {testimonialsData.map((t, i) => (
                <button
                  key={t.id}
                  aria-label={`Go to testimonial ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === index ? "w-6 bg-gold" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
            <button
              aria-label="Next testimonial"
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-offwhite transition-colors hover:border-gold/40 hover:text-gold cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}