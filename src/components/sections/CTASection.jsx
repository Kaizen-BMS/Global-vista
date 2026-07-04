"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { fadeUp } from "@/animations/fadeUp";

export default function CTASection() {
  return (
    <section className="relative px-6 py-14 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          {...fadeUp(0)}
          className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent p-12 text-center backdrop-blur-xl sm:p-16"
        >
          <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gold/20 blur-[100px]" />
          <h2 className="relative font-display text-3xl text-offwhite sm:text-4xl lg:text-5xl">
            Ready to Begin Your Global
            <br /> Learning Journey?
          </h2>
          <p className="relative mt-5 text-base text-muted">
            Book a free consultation and meet your mentor within 48 hours.
          </p>
          <div className="relative mt-9 flex justify-center">
            <Button as="a" href="/contact" variant="primary">
              Book Free Consultation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}