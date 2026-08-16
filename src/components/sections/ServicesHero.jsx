"use client";

import { motion } from "framer-motion";

import SectionLabel from "@/components/ui/SectionLabel";
import GlassCard from "@/components/ui/GlassCard";
import { fadeUp } from "@/animations/fadeUp";
import { staggerContainer } from "@/animations/staggerContainer";

export default function ServicesHero() {
  const cards = [
    {
      title: "Career Counselling & Study Abroad Guidance",
      description:
        "Comprehensive career counselling for students, parents and educators, combined with expert guidance for studying abroad. We help students identify the right career path, choose suitable universities, explore international education opportunities, and receive support with admissions, applications, scholarships and academic planning, particularly for the United Kingdom and other leading destinations.",
      icon: "🎓",
      button: "Watch Introduction Video",
      // TODO: paste the YouTube URL for this service's intro video
      videoUrl: "",
    },
    {
      title: "International Summer School Visits (UK)",
      description:
        "Experience world-class education through our International Summer School programmes in the United Kingdom. Students gain hands-on learning, cultural exposure, university visits, leadership development, and interaction with global educators while exploring renowned academic institutions across the UK.",
      icon: "✈️",
      button: "Watch Introduction Video",
      // TODO: paste the YouTube URL for this service's intro video
      videoUrl: "",
    },
    {
      title: "CERN Educational Visits",
      description:
        "Explore opportunities in science, engineering, technology and research through educational visits to CERN and its global innovation ecosystem.",
      icon: "⚛️",
      button: "Watch Introduction Video",
      // TODO: paste the YouTube URL for this service's intro video
      videoUrl: "",
      linkText: "Know More About CERN →",
      linkHref: "https://home.cern/",
    },
  ];

  return (
    <section className="relative overflow-hidden px-6 pt-36 pb-24 lg:px-10">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-20 h-72 w-72 rounded-full bg-[#001F6B]/20 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 h-72 w-72 rounded-full bg-[#D89B1D]/10 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Hero Content */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.div {...fadeUp(0)}>
            <SectionLabel className="justify-center">
              Services
            </SectionLabel>
          </motion.div>

          <motion.h1
            {...fadeUp(0.12)}
            className="mt-5 font-display text-4xl text-offwhite sm:text-5xl lg:text-6xl"
          >
            Support Built Around How You Learn
          </motion.h1>

          <motion.p
            {...fadeUp(0.24)}
            className="mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg"
          >
            From academic excellence to mentorship and career guidance,
            every service is designed to empower students and support parents
            throughout the learning journey.
          </motion.p>
        </div>

        {/* Three Service Cards */}
        <motion.div
          {...staggerContainer(0.12)}
          className="mt-20 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map((card) => (
            <motion.div key={card.title} variants={fadeUp()} className="h-full">
              <GlassCard
                hover={false}
                className="group relative flex min-h-[535px] flex-col p-7 transition-all duration-300 hover:-translate-y-2 hover:border-gold/30 hover:bg-white/[0.07]"
              >
                {/* Icon */}
                <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-4xl">
                  {card.icon}
                </div>

                {/* Title */}
                <h3 className="font-display text-2xl font-semibold leading-tight text-offwhite">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="mt-6 flex-1 text-[15px] leading-7 text-muted">
                  {card.description}
                </p>

                {/* CERN link */}
                {card.linkText && (
                  <a
                    href={card.linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-5 mt-6 inline-flex items-center text-lg font-semibold text-gold transition hover:translate-x-1"
                  >
                    {card.linkText}
                  </a>
                )}

                {/* Button — opens the intro video on YouTube once videoUrl is set */}
                {card.videoUrl ? (
                  <a
                    href={card.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-navy shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(216,155,29,0.35)]"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[9px] text-gold">
                      ▶
                    </span>
                    {card.button}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Video link coming soon"
                    className="mt-5 inline-flex w-fit cursor-not-allowed items-center gap-2 rounded-xl bg-gold/40 px-6 py-3 text-sm font-semibold text-navy/60 shadow-md"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-navy/40 text-[9px] text-gold/60">
                      ▶
                    </span>
                    {card.button}
                  </button>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}