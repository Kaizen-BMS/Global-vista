"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import SectionLabel from "@/components/ui/SectionLabel";
import GlassCard from "@/components/ui/GlassCard";
import { fadeUp } from "@/animations/fadeUp";
import { staggerContainer } from "@/animations/staggerContainer";

/** Accepts youtu.be/, youtube.com/watch?v=, or youtube.com/embed/ links and
 * returns the bare video id — the only part actually needed for an embed. */
function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? match[1] : null;
}

function VideoModal({ videoId, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        role="dialog" aria-modal="true" aria-label="Introduction video"
        className="relative w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button" onClick={onClose} aria-label="Close video"
          className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 bg-navy text-gold transition hover:bg-gold hover:text-navy cursor-pointer"
        >
          ✕
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-gold/20 shadow-2xl">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="Introduction video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ServicesHero() {
  const [activeVideoId, setActiveVideoId] = useState(null);
  const cards = [
    {
      title: "Career Counselling & Study  Guidance",
      descriptionPoints: [
        "Tailored career counselling for students, parents, and educators.",
        "Personalized guidance to identify career paths and select suitable universities.",
        "Comprehensive support for exploring national & international education opportunities.",
        // "Explore national and international education opportunities",
        "Hands-on assistance with university applications, admission processes, and scholarship acquisition.",
      ],
      icon: "🎓",
      button: "Watch Introduction Video",
      videoUrl: "https://youtu.be/xStCrdI58-c",
    },
    {
      title: "International Summer School Visits (UK)",
      descriptionPoints: [
        "World-class International Summer School programmes in the United Kingdom",
        "Hands-on learning experiences",
        "Cultural exposure and university visits",
        // "Leadership development",
        "Interaction with global educators at renowned UK institutions",
      ],
      icon: "✈️",
      button: "Watch Introduction Video",
      videoUrl: "https://youtu.be/R4NSvXmZbUA",
    },
    {
      title: "CERN Educational Visits",
      descriptionPoints: [
        "Educational visits to CERN and its global innovation ecosystem",
        "Exploring the Opportunities in science, engineering, technology and research",
      ],
      icon: "⚛️",
      button: "Watch Introduction Video",
      videoUrl: "https://youtu.be/i7pjmRpMxYw",
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
            Gateway to Global Careers.
          </motion.h1>

          <motion.p
            {...fadeUp(0.24)}
            className="mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg"
          >
            Unlock world-class opportunities tailored to your potential. Whether discovering career pathways, exploring top global universities, or experiencing ground breaking science at CERN, we guide every step of your global journey.
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
                <ul className="mt-6 flex-1 space-y-2.5 text-[15px] leading-6 text-muted">
                  {card.descriptionPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/70" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

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

                {/* Button — opens the intro video inline (modal), no redirect */}
                {card.videoUrl ? (
                  <button
                    type="button"
                    onClick={() => setActiveVideoId(getYouTubeId(card.videoUrl))}
                    className="mt-5 inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-navy shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(216,155,29,0.35)]"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[9px] text-gold">
                      ▶
                    </span>
                    {card.button}
                  </button>
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

      <AnimatePresence>
        {activeVideoId && <VideoModal videoId={activeVideoId} onClose={() => setActiveVideoId(null)} />}
      </AnimatePresence>
    </section>
  );
}