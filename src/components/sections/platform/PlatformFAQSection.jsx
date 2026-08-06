"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";
import FAQCard from "@/components/cards/FAQCard";
import { platformFaqs } from "@/data/platformLandingData";
import { fadeUp } from "@/animations/fadeUp";

export default function PlatformFAQSection() {
  const [openId, setOpenId] = useState(platformFaqs[0]?.id ?? null);

  return (
    <section className="relative px-6 py-24 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <motion.div {...fadeUp(0)} className="text-center">
          <SectionLabel className="justify-center">FAQ</SectionLabel>
          <h2 className="mt-4 font-display text-3xl text-offwhite sm:text-4xl">Questions, answered</h2>
        </motion.div>

        <div className="mt-12 flex flex-col gap-4">
          {platformFaqs.map((faq) => (
            <FAQCard
              key={faq.id}
              question={faq.question}
              answer={faq.answer}
              isOpen={openId === faq.id}
              onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
