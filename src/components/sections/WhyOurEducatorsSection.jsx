"use client";

import { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  University,
  GraduationCap,
  FlaskConical,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { useCountUp } from "@/hooks/useCountUp";
import { fadeUp } from "@/animations/fadeUp";
import { staggerContainer, staggerItem } from "@/animations/staggerContainer";

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

const stats = [
  { value: 5000, suffix: "+", label: "Students Mentored" },
  { value: 100, suffix: "+", label: "UK Educators" },
  { value: 20, suffix: "+", label: "Countries Supported" },
  { value: 95, suffix: "%", label: "Student Satisfaction" },
];

const cards = [
  {
    icon: University,
    title: "Experienced UK Academics & Educators",
    description:
      "Our educators teach and hold leadership positions at leading universities, colleges and educational institutions across the United Kingdom.",
 highlights: [
  {
    label: "UK University Experience",
  },
  {
    label: "International Curriculum Expertise",
  },
  {
    label: "Real Academic Exposure",
  },
],
    gradient: "from-[#1E3A8A]/30 to-[#001F6B]/10",
    delay: 0,
  },
  {
    icon: GraduationCap,
    title: "Proven Teaching Excellence",
    description:
      "Thousands of students have benefited from our teaching methodologies, mentorship programs and personalised academic guidance.",
   highlights: [
  {
    label: "Student Success Stories",
  },
  {
    label: "Personalized Mentorship",
  },
  {
    label: "Exam Excellence",
  },
],
    gradient: "from-[#D89B1D]/10 to-[#001F6B]/10",
    delay: 0.08,
  },
  {
    icon: FlaskConical,
    title: "Global Research Experience",
    description:
      "Our educators bring real-world scientific and research experience from internationally recognised organisations and institutions, including CERN research collaborations.",
   highlights: [
  {
    label: "Research-Based Learning",
  },
  {
    label: "STEM Innovation",
  },
  {
    label: "Industry Insights",
  },
  {
    label: "CERN Collaboration",
    link: "https://home.cern",
  },
],
    gradient: "from-[#1E3A8A]/30 to-[#001F6B]/10",
    delay: 0.16,
  },
  {
    icon: HeartHandshake,
    title: "Mentors Who Care",
    description:
      "We focus on understanding each student's goals, strengths and aspirations to provide personalised guidance throughout their journey.",
   highlights: [
  {
    label: "Career Guidance",
  },
  {
    label: "University Planning",
  },
  {
    label: "Personal Development",
  },
],
    gradient: "from-[#D89B1D]/10 to-[#001F6B]/10",
    delay: 0.24,
  },
];

/* -------------------------------------------------------------------------- */
/* Sub-component: animated stat counter                                        */
/* -------------------------------------------------------------------------- */

function StatCounter({ value, suffix, label }) {
  const { ref, value: animated } = useCountUp(value, 1.8);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 text-center">
      <span className="font-display text-4xl font-normal text-gold sm:text-5xl">
        {animated}
        {suffix}
      </span>
      <span className="text-xs uppercase tracking-[0.2em] text-muted">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-component: individual educator card                                    */
/* -------------------------------------------------------------------------- */

function EducatorCard({ icon: Icon, title, description, highlights, gradient, delay }) {
  return (
    <motion.div variants={staggerItem}>
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="group relative h-full"
      >
        {/* Hover glow aura */}
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-gold/0 to-gold/0 opacity-0 blur-sm transition-all duration-500 group-hover:from-gold/20 group-hover:to-gold/5 group-hover:opacity-100" />

        {/* Animated border gradient */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-gold/40 transition-all duration-500 group-hover:opacity-100" />

        <GlassCard
          hover={false}
          className={`relative h-full overflow-hidden bg-gradient-to-br ${gradient} p-8`}
        >
          {/* Inner soft radial glow on hover */}
          <div className="pointer-events-none absolute -top-10 right-0 h-36 w-36 rounded-full bg-gold/0 blur-[60px] transition-all duration-700 group-hover:bg-gold/12" />

          {/* Icon block */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 transition-all duration-300 group-hover:border-gold/40 group-hover:bg-gold/18 group-hover:shadow-[0_0_28px_rgba(216,155,29,0.3)]">
            <Icon className="h-6 w-6 text-gold" strokeWidth={1.6} />
          </div>

          {/* Title */}
          <h3 className="mt-6 font-display text-xl leading-tight text-offwhite sm:text-[1.35rem]">
            {title}
          </h3>

          {/* Description */}
          <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>

          {/* Highlights */}
          <ul className="mt-6 flex flex-col gap-2.5">
           {highlights.map((point) => (
  <li key={point.label} className="flex items-center gap-2.5">
    <CheckCircle2
      className="h-3.5 w-3.5 shrink-0 text-gold/80"
      strokeWidth={2}
    />

    {point.link ? (
      <a
        href={point.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gold transition-colors hover:text-amber-300 hover:underline"
      >
        {point.label}
      </a>
    ) : (
      <span className="text-xs text-offwhite/80">
        {point.label}
      </span>
    )}
  </li>
))}
          </ul>

          {/* Bottom accent line that grows on hover */}
          <div className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full bg-gradient-to-r from-gold/80 to-gold/20 transition-all duration-500 group-hover:w-full" />
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Background particles — seeded so SSR and client match                      */
/* -------------------------------------------------------------------------- */

function seeded(n) {
  let v = n;
  return () => {
    v = (v * 9301 + 49297) % 233280;
    return v / 233280;
  };
}

function BackgroundParticles() {
  const particles = useMemo(() => {
    const r = seeded(77);
    return Array.from({ length: 22 }).map((_, i) => ({
      id: `we-p-${i}`,
      top: r() * 100,
      left: r() * 100,
      size: r() * 3 + 2,
      delay: r() * 6,
      duration: r() * 8 + 7,
      gold: i % 3 !== 0,
    }));
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`absolute rounded-full ${p.gold ? "bg-gold/60" : "bg-white/30"}`}
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            boxShadow: p.gold ? "0 0 8px 2px rgba(216,155,29,0.4)" : "none",
            animation: `we-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes we-float {
          0%, 100% { transform: translate(0, 0); opacity: 0.25; }
          50%       { transform: translate(7px, -13px); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Root section                                                               */
/* -------------------------------------------------------------------------- */

export default function WhyOurEducatorsSection() {
  return (
    <section className="relative overflow-hidden px-6 py-28 lg:px-10">
      {/* Atmospheric glow layers */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#001F6B]/25 blur-[150px]" />
        <div className="absolute right-0 bottom-1/4 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-[#1E3A8A]/20 blur-[150px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.05] blur-[120px]" />
      </div>

      <BackgroundParticles />

      <div className="mx-auto max-w-7xl">
        {/* ── Header ── */}
        <motion.div {...fadeUp(0)} className="mx-auto max-w-3xl text-center">
          <SectionLabel className="justify-center">Our Educators</SectionLabel>

          <h2 className="mt-5 font-display text-4xl leading-tight text-offwhite sm:text-5xl lg:text-[3.25rem]">
            Why Learn From{" "}
            <span className="bg-gradient-to-r from-gold via-amber-300 to-gold bg-clip-text text-transparent">
              Global Experts?
            </span>
          </h2>

          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            Our educators are more than teachers — they are mentors,
            researchers, academics and industry professionals dedicated to
            shaping global futures.
          </p>
        </motion.div>

        {/* ── Stats row ── */}
        {/* <motion.div {...fadeUp(0.12)}>
          <GlassCard
            hover={false}
            className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-y-8 px-8 py-10 sm:grid-cols-4 sm:gap-y-0"
          >
            {stats.map((stat) => (
              <StatCounter key={stat.label} {...stat} />
            ))}
          </GlassCard>
        </motion.div> */}

        {/* ── Cards grid ── */}
        <motion.div
          {...staggerContainer(0.1, 0.1)}
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {cards.map((card) => (
            <EducatorCard key={card.title} {...card} />
          ))}
        </motion.div>

        {/* ── Footer CTA ── */}
        <motion.div {...fadeUp(0.15)} className="mt-16 flex flex-col items-center gap-6 text-center">
          <p className="font-display text-2xl text-offwhite sm:text-3xl">
            We don&rsquo;t just teach subjects —
            <br />
            <span className="text-gold">we help students build futures.</span>
          </p>

          {/* <Button as="a" href="/about" variant="primary">
            Meet Our Educators
            <ArrowRight className="h-4 w-4" />
          </Button> */}
        </motion.div>
      </div>
    </section>
  );
}