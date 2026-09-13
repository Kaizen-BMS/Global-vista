"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ChevronDown, Sparkles, Shield, Crown, Gem, Check, X, Power, UserCircle2,
} from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import { PAGE_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_FAINT, BORDER, BORDER_SOFT, ACCENT } from "@/components/platformHome/editorialTheme";
import { withGst } from "@/lib/helpers/gst";

// This public, international-facing page deliberately never says "GST" —
// the actual math is unchanged (still the real 18% rate from gst.js), only
// the LABEL is generic here so a visitor outside India isn't confused by a
// tax name that means nothing to them. The real India tax invoice (the
// checkout/subscription screens) still itemizes GST explicitly, since
// that's a real compliance requirement there — this swap is display-only,
// and only on this marketing page.
const TAX_LABEL = "including taxes";

/**
 * Document-style homepage — a printed-sheet look (masthead, thin rules,
 * serif headline) carried over from the earlier v2-mockup rewrite, now
 * built out into a full Zoho/Odoo-style marketing page: a hero "connected
 * products" graphic, the real product walkthrough video, a
 * permanently-visible pricing + comparison pair (never collapsed behind a
 * toggle), and an FAQ. Every claim here is something this app actually
 * has — nothing invented to pad the page out — and nothing here
 * fabricates customer counts, logos, or quoted testimonials, which this
 * project doesn't have real ones for yet.
 */
const SERIF = "font-[family-name:var(--font-source-serif)]";
// Written as their own complete, literal class strings (not derived via
// .split() on PAGE_BG/ACCENT/etc at runtime) — Tailwind's build-time scanner
// only ever generates CSS for a class name it can find as literal text
// somewhere in the source, so a runtime-computed string never produces
// real styles no matter how correct the resulting string looks.
const HOVER_PRIMARY = "hover:text-[#0B0E14] dark:hover:text-[#F4F3EF]";

function Fade({ children, className = "", delay = 0, id, style, ...motionProps }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

function MicroLabel({ children, className = "" }) {
  return <p className={`text-[10px] font-medium uppercase tracking-[0.16em] ${TEXT_FAINT} ${className}`}>{children}</p>;
}

/** Compact list kept for the footer's own Services column (short labels,
 * no room for the full descriptions the feature grid below uses). */
const SERVICES = [
  { label: "CRM & Leads" },
  { label: "Customization" },
  { label: "Communication" },
  { label: "Analytics" },
  { label: "Operations" },
  { label: "Payments" },
  { label: "Security" },
];

const FAQS = [
  { q: "Is this a multi-tenant platform?", a: "Yes. Every company gets its own isolated workspace — data, users, roles, and branding are scoped per tenant and never cross over." },
  { q: "Can we use our own branding?", a: "Yes. Logo, favicon, and color scheme are configurable per company from Settings, and apply across the sidebar, reports, and outgoing email." },
  { q: "What does the pricing above actually include?", a: "The price on every plan card already includes tax — nothing added at checkout beyond a coupon discount you choose to apply. Longer commitment terms cost less per month." },
  { q: "What payment methods are supported?", a: "Checkout runs through Razorpay — cards, UPI, and net banking are all supported there." },
  { q: "Can I change plans later?", a: "Yes — upgrade or change your commitment term anytime from Settings → Subscription, effective immediately or at your next renewal." },
];

const DURATION_LABELS = { 1: "1 month", 3: "Quarterly", 6: "Half-yearly", 12: "Yearly", 24: "2 years", 36: "3 years" };
function durationLabel(m) { return DURATION_LABELS[m] || `${m} months`; }

/** A plan's own name drives its color everywhere it appears (pricing card,
 * feature matrix header) — Silver reads silver, Gold reads gold, Diamond
 * reads diamond, matched case-insensitively on the plan's actual name so
 * this never needs updating if plans are renamed/added later. Anything
 * that isn't one of those three metals (Starter, or any custom plan name)
 * falls back to the page's own neutral/indigo theme. */
const PLAN_THEMES = {
  silver: { icon: Shield, text: "text-slate-500 dark:text-slate-300", border: "border-slate-400/40 dark:border-slate-300/30", wash: "bg-slate-400/10 dark:bg-slate-300/10", chip: "bg-slate-400/15 text-slate-600 dark:text-slate-300", button: "bg-slate-500 hover:bg-slate-400 text-white", grad: "from-slate-400 to-slate-300", ring: "ring-slate-400/30" },
  gold: { icon: Crown, text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/40 dark:border-amber-400/30", wash: "bg-amber-500/10 dark:bg-amber-400/10", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400", button: "bg-amber-500 hover:bg-amber-400 text-black", grad: "from-amber-500 to-orange-400", ring: "ring-amber-400/30" },
  diamond: { icon: Gem, text: "text-sky-500 dark:text-sky-300", border: "border-sky-400/40 dark:border-sky-300/30", wash: "bg-sky-400/10 dark:bg-sky-300/10", chip: "bg-sky-400/15 text-sky-600 dark:text-sky-300", button: "bg-sky-500 hover:bg-sky-400 text-white", grad: "from-sky-500 to-cyan-400", ring: "ring-sky-400/30" },
};
function planTheme(name) {
  const key = Object.keys(PLAN_THEMES).find((k) => (name || "").toLowerCase().includes(k));
  return key ? PLAN_THEMES[key] : null;
}
/** Real plan names on this deployment ("30 Days Trial", "Essential",
 * "Professional", "Concierge") don't match any metal keyword above, so
 * every card fell back to a flat, uncolored box — this is the actual
 * cause of the pricing/compare sections reading as plain. This palette
 * gives EVERY plan a real color identity (cycling by position) whenever
 * its name isn't literally a metal, so the section always reads as
 * designed regardless of what plans are configured. */
const FALLBACK_THEMES = [
  { icon: Sparkles, text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30 dark:border-emerald-400/25", wash: "bg-emerald-500/8 dark:bg-emerald-400/8", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", button: "bg-emerald-600 hover:bg-emerald-500 text-white", grad: "from-emerald-500 to-teal-400", ring: "ring-emerald-400/30" },
  { icon: Shield, text: "text-slate-500 dark:text-slate-300", border: "border-slate-400/40 dark:border-slate-300/30", wash: "bg-slate-400/8 dark:bg-slate-300/8", chip: "bg-slate-400/15 text-slate-600 dark:text-slate-300", button: "bg-slate-600 hover:bg-slate-500 text-white", grad: "from-slate-400 to-slate-300", ring: "ring-slate-400/30" },
  { icon: Crown, text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/40 dark:border-indigo-400/30", wash: "bg-indigo-500/8 dark:bg-indigo-400/10", chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400", button: "bg-indigo-600 hover:bg-indigo-500 text-white", grad: "from-indigo-500 to-violet-500", ring: "ring-indigo-400/40" },
  { icon: Gem, text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/40 dark:border-amber-400/30", wash: "bg-amber-500/10 dark:bg-amber-400/10", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400", button: "bg-amber-500 hover:bg-amber-400 text-black", grad: "from-amber-500 to-orange-400", ring: "ring-amber-400/30" },
];
function cardTheme(name, index) {
  return planTheme(name) || FALLBACK_THEMES[index % FALLBACK_THEMES.length];
}

/** The masthead's own little fact strip — CRM/ERP/trial/etc — as a
 * continuously moving ticker instead of a static 3-column row, so it
 * draws the eye the same way the offers strip above it does. */
const MASTHEAD_PHRASES = ["CRM · ERP · Automation", "For growing teams", "30-day free trial", "Multi-tenant workspace", "Role-based access", "Transparent pricing"];
function MastheadMarquee() {
  const repeated = [...MASTHEAD_PHRASES, ...MASTHEAD_PHRASES, ...MASTHEAD_PHRASES];
  return (
    <div className="overflow-hidden py-3">
      <div className="flex w-max animate-marquee-fast" style={{ animationDuration: "24s" }}>
        {repeated.map((t, i) => (
          <div key={i} className="mx-6 flex items-center gap-2.5 shrink-0 whitespace-nowrap">
            <MicroLabel>{t}</MicroLabel>
            <span className="h-1 w-1 rounded-full bg-indigo-400/60 shrink-0" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The scrolling offers ticker — a thin strip under the masthead so it
 * fits the lighter editorial theme instead of a fixed dark bar. */
function OffersMarquee({ offers }) {
  if (!offers.length) return null;
  const repeatCount = Math.max(2, Math.ceil(16 / Math.max(offers.length, 1)));
  const repeated = Array.from({ length: repeatCount }, () => offers).flat();
  const seconds = repeatCount * 14;
  return (
    <div className={`border-b ${BORDER} overflow-hidden`}>
      <div className="flex w-max animate-marquee-fast py-2" style={{ animationDuration: `${seconds}s` }}>
        {[...repeated, ...repeated].map((offer, i) => (
          <div key={`${offer.id}-${i}`} className="mx-6 flex shrink-0 items-center gap-3 whitespace-nowrap">
            <span className={`text-[11px] uppercase tracking-[0.15em] ${TEXT_SECONDARY}`}>{offer.text}</span>
            <span className="h-1 w-1 rounded-full shrink-0 bg-indigo-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Short, factual value props consistent with the rest of this page —
 * never a new unverified claim invented just for this strip. Shown as a
 * genuinely MOVING ticker (not a fade-swap) so it stays readable in
 * motion rather than snapping between phrases. */
const HERO_CAPTIONS = [
  "CRM, messaging, and billing — one workspace.",
  "Transparent pricing on every plan, no surprises at checkout.",
  "Role-based access for every team, every branch.",
  "Real-time notifications, tuned per employee.",
];
function CaptionMarquee() {
  const repeated = [...HERO_CAPTIONS, ...HERO_CAPTIONS, ...HERO_CAPTIONS];
  return (
    <div className="h-8 px-4 rounded-full bg-[#0B0E14] flex items-center overflow-hidden">
      <div className="flex w-max animate-marquee-fast" style={{ animationDuration: "20s" }}>
        {repeated.map((c, i) => (
          <span key={i} className="mx-4 shrink-0 whitespace-nowrap text-white/90 text-xs">{c}</span>
        ))}
      </div>
    </div>
  );
}

function ScrollCue() {
  return (
    <div className={`relative h-6 w-4 rounded-full border-2 ${TEXT_FAINT} border-current shrink-0`} aria-hidden="true">
      <motion.span
        className="absolute left-1/2 top-1 h-1 w-1 -translate-x-1/2 rounded-full bg-current"
        animate={{ y: [0, 6, 0], opacity: [1, 0, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/**
 * `CROP_FRACTION` is how much of the raw frame's width is real content —
 * 1 means "use the video's own native width, no cropping." Set below 1
 * only for a recording that has actual black pillarboxing down both sides
 * (a wider capture canvas than the real browser content); it's applied by
 * giving the wrapper an `aspect-ratio` narrower than the video's own,
 * computed from the video's REAL measured resolution (via
 * `loadedmetadata`, not a guessed/hardcoded one), then letting
 * `object-fit: cover` crop in from both sides equally — never stretches
 * or distorts the picture the way scaling the element itself would. The
 * newer recording (below) has no pillarboxing, so this stays at 1.
 */
const CROP_FRACTION = 1;

/** Soft, slowly-pulsing blurred blobs behind the monitor — purely
 * decorative motion (never real content), gives the walkthrough section
 * some life instead of a static device sitting on a flat background. */
const MONITOR_GLOWS = [
  { className: "bg-indigo-400/25", style: { left: "8%", top: "10%", width: 180, height: 180 }, delay: 0 },
  { className: "bg-violet-400/20", style: { right: "10%", top: "0%", width: 150, height: 150 }, delay: 1.2 },
  { className: "bg-sky-400/20", style: { left: "50%", bottom: "-10%", width: 200, height: 200 }, delay: 0.6 },
];

/** The hanging power toggle beside the monitor — swings gently like a
 * pull-cord switch, click to power the monitor off/on. Purely a fun
 * interaction layered on top of the real walkthrough; it never removes
 * the video, just pauses it behind a "screen off" standby state. */
function HangingToggle({ on, onToggle }) {
  return (
    <div className="hidden md:flex flex-col items-center absolute -right-14 top-4 z-10">
      <div className="w-px h-12 bg-gray-300/70" aria-hidden="true" />
      <motion.button
        type="button"
        onClick={onToggle}
        animate={{ rotate: [-5, 5, -4, 4, -5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.85, rotate: 0 }}
        style={{ transformOrigin: "top center" }}
        aria-label={on ? "Turn the demo screen off" : "Turn the demo screen on"}
        className={`h-9 w-9 rounded-full border-2 shadow-md flex items-center justify-center cursor-pointer transition-colors ${
          on ? "bg-emerald-500 border-emerald-300" : "bg-gray-400 border-gray-300"
        }`}
      >
        <Power className="h-4 w-4 text-white" />
      </motion.button>
    </div>
  );
}

/**
 * The real product walkthrough — an actual screen recording
 * (`/videos/Kaizen BMS Walkthrough new.mp4`), not a recreated animation.
 * Deliberately shown WITHOUT player controls — no scrubber, no play
 * button — so it reads as a self-running automated demo (like a looping
 * GIF) rather than "a video someone has to click play on": it starts the
 * moment it scrolls into view, loops forever, and pauses again once
 * scrolled out of view (or once the hanging toggle switches it off).
 */
function WalkthroughVideo() {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [aspect, setAspect] = useState(16 / 9); // replaced the instant the real video metadata loads
  const [monitorOn, setMonitorOn] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView && monitorOn) el.play().catch(() => {}); // muted autoplay is allowed everywhere; no controls to fall back on if a browser ever blocks it
    else el.pause();
  }, [inView, monitorOn]);

  return (
    <div ref={ref} className="relative mx-auto" style={{ maxWidth: 900 }}>
      {MONITOR_GLOWS.map((g, i) => (
        <motion.div
          key={i} aria-hidden="true" className={`absolute rounded-full blur-3xl pointer-events-none ${g.className}`} style={g.style}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: g.delay }}
        />
      ))}
      <HangingToggle on={monitorOn} onToggle={() => setMonitorOn((v) => !v)} />
      <div className="relative">
        {/* Monitor bezel — plain hardware grays regardless of site theme
            (a device frame, like Apple's own mockups, isn't something that
            should flip with light/dark mode). */}
        <div className="rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 p-2.5 sm:p-3.5 shadow-[0_35px_60px_-25px_rgba(0,0,0,0.5)] border border-gray-700/60">
          <div className="relative rounded-md overflow-hidden bg-black" style={{ aspectRatio: aspect }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src="/videos/Kaizen%20BMS%20Walkthrough%20new.mp4"
              className={`w-full h-full object-cover transition-opacity duration-300 ${monitorOn ? "opacity-100" : "opacity-0"}`}
              autoPlay
              muted
              loop
              playsInline
              disablePictureInPicture
              preload="auto"
              onLoadedMetadata={(e) => {
                const { videoWidth, videoHeight } = e.currentTarget;
                if (videoWidth && videoHeight) setAspect((videoWidth * CROP_FRACTION) / videoHeight);
              }}
            />
            {!monitorOn && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black overflow-hidden"
              >
                {/* Soft standby glow behind the logo — same pulsing-blob
                    language as MONITOR_GLOWS outside the screen, just
                    contained to this standby state. */}
                <motion.div
                  aria-hidden="true"
                  className="absolute rounded-full blur-3xl bg-indigo-500/25"
                  style={{ width: "60%", aspectRatio: 1 }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/KaizenBMS%20infinity%20logo.png" alt="" className="relative h-20 w-20 sm:h-28 sm:w-28 object-contain opacity-95 drop-shadow-[0_0_25px_rgba(99,102,241,0.45)]" />
                <p className="relative text-white text-xl sm:text-2xl font-bold tracking-wide">KaizenBMS Platform</p>
                <p className="relative text-white/50 text-xs sm:text-sm tracking-[0.3em] uppercase">CRM · ERP</p>
              </motion.div>
            )}
          </div>
          {/* webcam notch */}
          <div className="mx-auto mt-2 sm:mt-2.5 h-1 w-8 rounded-full bg-gray-700" />
        </div>
        {/* stand neck */}
        <div className="mx-auto h-5 sm:h-7 w-4 sm:w-5 bg-gradient-to-b from-gray-700 to-gray-800" style={{ clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0% 100%)" }} />
        {/* base */}
        <div className="mx-auto h-2.5 w-32 sm:w-44 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 shadow-lg" />
      </div>
    </div>
  );
}

export default function PlatformHome({ plans, viewer, offers = [] }) {
  const displayPlans = plans; // listPublicPlans() already returns only status='active' plans, null-price (free) one first
  const pricingBanner = offers[0] || null;
  const activeStates = ["active", "trial", "past_due", "payment_failed"];

  const durationOptions = useMemo(() => {
    const months = new Set([1]);
    displayPlans.forEach((p) => (p.durationTiers || []).forEach((t) => months.add(t.durationMonths)));
    return [...months].sort((a, b) => a - b);
  }, [displayPlans]);
  const [months, setMonths] = useState(1);

  function tierFor(plan) {
    if (months === 1) return { months: 1, price: plan.price };
    const tier = (plan.durationTiers || []).find((t) => t.durationMonths === months);
    return tier ? { months, price: tier.price } : { months: 1, price: plan.price };
  }

  /** Same auth-aware routing this page has used since the duration-pricing
   * work — a logged-out visitor logs in first (redirected straight back to
   * checkout), an existing paying Super Admin sees "Upgrade", everyone
   * else "Start Free"/"Choose Plan". A free/trial plan always routes to
   * self-registration — there's no gateway checkout behind a null price. */
  function ctaFor(plan, tier) {
    if (plan.price == null) return { href: "/register", label: "Start Free" };
    const target = `/workspace/settings/subscription?checkoutPlan=${plan.id}&checkoutMonths=${tier.months}`;
    if (!viewer?.loggedIn) return { href: `/login?redirect=${encodeURIComponent(target)}`, label: "Log in to subscribe" };
    if (!viewer.isSuperAdmin) return { href: "/workspace/settings/subscription", label: "Ask your admin" };
    if (viewer.currentPlanId === plan.id && activeStates.includes(viewer.currentPlanState)) return { href: target, label: "Current plan", disabled: true };
    if (viewer.currentPlanId && activeStates.includes(viewer.currentPlanState)) return { href: target, label: "Upgrade" };
    return { href: target, label: "Choose plan" };
  }

  const paidCount = displayPlans.filter((p) => p.price != null).length;
  const highlightIndex = paidCount > 1 ? displayPlans.findIndex((p) => p.price != null) + 1 : -1;

  // Matches the company's own comparison spreadsheet row-for-row, in the
  // same order, sourced entirely from real plan fields — nothing here is
  // hardcoded to a specific plan name. The last block (feature-flag rows:
  // AI Analytic Reports, Dedicated Account Manager, etc.) is fully
  // dynamic: it's the UNION of whatever `featureFlags` label every
  // currently-displayed plan has configured (in first-seen order), read
  // from the Platform Admin's Plan editor — adding, renaming, or removing
  // one of those rows for any plan needs zero further code changes here.
  const featureFlagLabels = [];
  for (const p of displayPlans) {
    for (const f of p.featureFlags || []) {
      if (!featureFlagLabels.includes(f.label)) featureFlagLabels.push(f.label);
    }
  }
  const comparisonRows = [
    { label: "Registration", get: (p) => p.registration_label || "Self" },
    { label: "Development cost", get: (p) => p.development_cost_label || "Free" },
    { label: "Installation cost", get: (p) => p.installation_cost_label || "Free" },
    { label: "Maintenance cost", get: (p) => p.maintenance_cost_label || "Free" },
    { label: "Max user count", get: (p) => p.max_users || "Unlimited" },
    { label: "Leads", get: (p) => p.max_leads || "Unlimited" },
    { label: "Storage", get: (p) => (p.max_storage_mb ? `${p.max_storage_mb >= 1024 ? `${Math.round(p.max_storage_mb / 1024)}GB` : `${p.max_storage_mb}MB`}` : "Unlimited") },
    { label: `Price (${TAX_LABEL})`, get: (p) => (p.price == null ? "Free trial" : `${p.currency} ${withGst(tierFor(p).price)}${p.pricing_model === "per_user" ? "/user" : ""}/mo`) },
    { label: "Payment method", get: (p) => p.payment_method_label || "x" },
    { label: "Billing model", get: (p) => (p.price == null ? "x" : p.pricing_model === "per_user" ? "Per user" : "Per company") },
    { label: "Data import / export", get: (p) => (p.allow_import_export === 0 ? false : true) },
    ...featureFlagLabels.map((label) => ({
      label,
      get: (p) => !!(p.featureFlags || []).find((f) => f.label === label)?.included,
    })),
  ];

  return (
    <div className={`${PAGE_BG} ${TEXT_PRIMARY} min-h-screen antialiased relative overflow-hidden`}>
      {/* Decorative radial wash, top-right — a one-time page-load reveal of
          a fixed background shape, not tied to scroll position. */}
      <div
        aria-hidden="true"
        className="animate-kb-wash absolute top-0 -right-35 w-130 h-130 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 30% 30%, rgb(99 102 241 / 0.12), transparent 68%)" }}
      />
      {offers.length > 0 && (
        <div className="relative">
          <OffersMarquee offers={offers} />
        </div>
      )}
      {/* Top padding is deliberately minimal — the page should start near
          the very top of the viewport, and only sit lower when the offers
          marquee above is actually rendered (its own height does that
          naturally); it shouldn't reserve a big empty gap for itself. */}
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 pt-4 sm:pt-6 pb-10 sm:pb-14 relative">

        {/* ============================================================
            MASTHEAD
            ============================================================ */}
        <header>
          <div className="flex items-end justify-between gap-4 flex-wrap pb-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/KaizenBMS%20infinity%20logo.png" alt="" className="h-12 sm:h-14 w-auto object-contain" />
              <p className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight`}>
                Kaizen <span className={ACCENT}>BMS</span>
              </p>
            </div>
            {/* Glassmorphic nav pill — one translucent, blurred bar holding
                every link, with "Start Free" as a solid accent pill inside
                it rather than a separate plain-text link. */}
            <div className={`flex items-center gap-1 flex-wrap rounded-full border border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md shadow-sm px-2 py-1.5`}>
              <a href="#walkthrough" className={`text-sm px-3 py-1.5 rounded-full ${TEXT_SECONDARY} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}>Overview</a>
              <a href="#pricing" className={`text-sm px-3 py-1.5 rounded-full ${TEXT_SECONDARY} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}>Packs</a>
              <a href="#compare" className={`text-sm px-3 py-1.5 rounded-full ${TEXT_SECONDARY} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}>Compare</a>
              <a href="#faq" className={`text-sm px-3 py-1.5 rounded-full ${TEXT_SECONDARY} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}>FAQ</a>
              {viewer?.loggedIn ? (
                <>
                  <Link href="/workspace/dashboard" className="text-sm font-medium px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors">Dashboard</Link>
                  <Link
                    href="/workspace/profile" aria-label="Your profile"
                    className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-semibold overflow-hidden"
                  >
                    {viewer.name ? viewer.name.trim().charAt(0).toUpperCase() : <UserCircle2 className="h-4.5 w-4.5" />}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className={`text-sm px-3 py-1.5 rounded-full ${TEXT_SECONDARY} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}>Log in</Link>
                  <Link href="/register" className="text-sm font-medium px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors">Start Free</Link>
                </>
              )}
            </div>
          </div>
          {/* kb-rule — draws in left-to-right on load */}
          <div className={`animate-kb-rule border-t-2 ${BORDER}`} />
          <MastheadMarquee />
          <div className={`border-t ${BORDER}`} />
        </header>

        {/* ============================================================
            HERO — kb-rise on load (not scroll-triggered): this is the
            first thing in the viewport, so it animates in immediately
            rather than waiting for a scroll event that hasn't happened.
            ============================================================ */}
        <div className="pt-8 sm:pt-10 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
            <div className="animate-kb-rise">
              <MicroLabel className="mb-4">Business management system</MicroLabel>
              <h1 className={`${SERIF} font-bold tracking-tight leading-[0.98] text-4xl sm:text-6xl`}>
                One workspace. Every part of your business, <span className={`italic ${ACCENT}`}>connected</span>.
              </h1>
              <p className={`mt-6 max-w-lg text-lg leading-relaxed ${TEXT_SECONDARY}`}>
                CRM, messaging, notifications, and billing — under one login. Start with leads, switch on the rest when you're ready.
              </p>
              <div className="mt-7 flex items-center gap-4 flex-wrap">
                <Link href="/register" className={`inline-flex items-center gap-1.5 text-sm font-medium px-5 py-2.5 rounded-md border ${TEXT_PRIMARY} border-current hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}>
                  Start Free →
                </Link>
                <span className={`text-sm ${TEXT_FAINT}`}>30-day trial, no card</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Multi-tenant", "Role-based access", "Transparent billing"].map((t) => (
                  <span key={t} className={`text-[11px] px-2.5 py-1 rounded-full border ${BORDER_SOFT} ${TEXT_FAINT}`}>{t}</span>
                ))}
              </div>
            </div>
            <div className="animate-kb-rise" style={{ animationDelay: "0.18s" }}>
              <div className={`relative rounded-xl border ${BORDER} overflow-hidden aspect-[4/3] bg-gradient-to-br from-indigo-500/[0.06] to-transparent`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/platform-hero-illustration.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="mt-10 animate-kb-rise" style={{ animationDelay: "0.3s" }}>
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex-1 min-w-0"><CaptionMarquee /></div>
              <ScrollCue />
            </div>
          </div>
        </div>

        {/* ============================================================
            PRODUCT WALKTHROUGH — the real screen recording, see
            WalkthroughVideo's own doc comment.
            ============================================================ */}
        <section id="walkthrough" className={`border-t ${BORDER} pt-10 sm:pt-12 mt-12 scroll-mt-6`}>
          <Fade className="mb-6">
            <MicroLabel className="mb-2">See it in action</MicroLabel>
            <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight`}>A tour of your new workspace.</h2>
          </Fade>
          <Fade delay={0.05}>
            <WalkthroughVideo />
          </Fade>
        </section>

        {/* ============================================================
            PRICING — permanent, never hidden behind a toggle.
            ============================================================ */}
        <section id="pricing" className={`border-t ${BORDER} pt-10 sm:pt-12 mt-12`}>
          <MicroLabel className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-indigo-400" /> Simple, transparent pricing
          </MicroLabel>
          <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
            <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight`}>Plans</h2>
            <p className={`text-xs ${TEXT_FAINT}`}>Per company, per month, {TAX_LABEL}. Longer terms cost less.</p>
          </div>

          {pricingBanner && (
            <Fade className={`mt-5 rounded-lg border ${BORDER} overflow-hidden`}>
              {pricingBanner.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pricingBanner.image_url} alt={pricingBanner.text || "Special offer"} className="w-full max-h-56 object-cover" />
                  {pricingBanner.text && <p className="px-4 py-2.5 text-sm">{pricingBanner.text}</p>}
                </>
              ) : (
                <p className="px-4 py-2.5 text-sm">{pricingBanner.text}</p>
              )}
            </Fade>
          )}

          {durationOptions.length > 1 && (
            <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md shadow-sm p-1 mt-6">
              {durationOptions.map((m) => (
                <button
                  key={m} type="button" onClick={() => setMonths(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    months === m ? `${TEXT_PRIMARY} bg-black/[0.06] dark:bg-white/[0.08]` : `${TEXT_FAINT} ${HOVER_PRIMARY}`
                  }`}
                >
                  {durationLabel(m)}
                </button>
              ))}
            </div>
          )}

          {displayPlans.length === 0 ? (
            <p className={`mt-8 text-sm ${TEXT_SECONDARY}`}>Plans are being configured — check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 items-stretch">
              {displayPlans.map((p, i) => {
                const isFree = p.price == null;
                const tier = tierFor(p);
                const cta = ctaFor(p, tier);
                const highlighted = i === highlightIndex;
                const theme = cardTheme(p.name, i);
                return (
                  <Fade
                    key={p.id} delay={i * 0.05}
                    whileHover={{ y: -6, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
                    className={`rounded-xl overflow-hidden flex flex-col border ${theme.wash} ${theme.border} ${highlighted ? `shadow-xl sm:-mt-3 ring-2 ${theme.ring}` : "shadow-sm"}`}
                  >
                    {/* Full-bleed color bar — every card gets its own
                        identity now (see cardTheme's doc comment), not
                        just the highlighted one. */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${theme.grad}`} aria-hidden="true" />
                    <div className={`p-5 flex flex-col flex-1 ${highlighted ? "sm:pt-7" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className={`${SERIF} text-4xl leading-none opacity-70 ${theme.text}`}>{String(i + 1).padStart(2, "0")}</span>
                        {highlighted && (
                          <motion.span
                            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${theme.chip}`}
                            animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            Most chosen
                          </motion.span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-3">
                        <theme.icon className={`h-4 w-4 shrink-0 ${theme.text}`} />
                        <p className={`${SERIF} text-xl font-bold ${theme.text}`}>{p.name}</p>
                      </div>

                      <p className={`${TEXT_PRIMARY} mt-2`}>
                        {isFree ? (
                          <span className="text-2xl font-semibold tabular-nums">Free</span>
                        ) : (
                          <>
                            <span className="text-2xl font-semibold tabular-nums">{p.currency} {withGst(tier.price)}</span>
                            <span className={`text-xs ${TEXT_FAINT}`}>/{p.pricing_model === "per_user" ? "user/mo" : "mo"}</span>
                          </>
                        )}
                      </p>
                      {/* Description, tax note, and the "5 users min" line
                          all moved to the Compare table below (Details /
                          Price / Minimum users rows) — a card only needs
                          the headline price. The free-trial card keeps its
                          own line since that's a genuinely different,
                          time-boxed offer worth calling out right here. */}
                      {isFree && (
                        <p className={`text-xs ${TEXT_FAINT} mt-1`}>
                          {p.trial_days ? `${p.trial_days}-day trial, no card required.` : "Free to get started."}
                        </p>
                      )}

                      <div className="flex-1" />

                      {cta.disabled ? (
                        <span className={`mt-5 text-center text-sm ${TEXT_FAINT} border ${BORDER_SOFT} rounded-md px-4 py-2`}>{cta.label}</span>
                      ) : (
                        <Link href={cta.href} className={`mt-5 text-center text-sm font-medium rounded-md px-4 py-2 transition-colors shadow-sm hover:shadow-md ${theme.button}`}>
                          {cta.label} →
                        </Link>
                      )}
                    </div>
                  </Fade>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================================
            FEATURE / PLAN COMPARISON — permanent, always rendered (no
            "show/hide" toggle) since this is the second thing the user
            asked to always keep visible alongside pricing itself.
            ============================================================ */}
        {displayPlans.length > 0 && (
          <section id="compare" className={`border-t ${BORDER} pt-10 sm:pt-12 mt-12`}>
            <MicroLabel className="mb-2 flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-indigo-400" /> Side by side
            </MicroLabel>
            <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight mb-6`}>Compare every plan</h2>
            <Fade className={`overflow-x-auto rounded-xl border ${BORDER} shadow-sm`}>
              <table className="w-full min-w-140 text-sm border-collapse">
                <thead>
                  <tr className={`border-b ${BORDER} text-left bg-gradient-to-r from-indigo-500/[0.04] via-violet-500/[0.03] to-transparent`}>
                    <th className={`py-3 pl-4 pr-4 font-medium ${TEXT_FAINT} text-xs uppercase tracking-wide sticky left-0 bg-[#FAFAF7] dark:bg-[#07080B]`}>Feature</th>
                    {displayPlans.map((p, ci) => {
                      const theme = cardTheme(p.name, ci);
                      const isTop = ci === highlightIndex;
                      return (
                        <th key={p.id} className={`py-3 px-4 font-semibold ${theme.text} ${isTop ? theme.wash : ""}`}>
                          <span className="flex items-center gap-1.5"><theme.icon className="h-3.5 w-3.5" /> {p.name}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className={`divide-y ${BORDER_SOFT}`}>
                  {comparisonRows.map((row, ri) => (
                    <motion.tr
                      key={row.label}
                      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, delay: ri * 0.03 }}
                      className="hover:bg-indigo-500/[0.03] dark:hover:bg-indigo-400/[0.04] transition-colors"
                    >
                      <td className={`py-2.5 pl-4 pr-4 ${TEXT_SECONDARY} sticky left-0 bg-[#FAFAF7] dark:bg-[#07080B]`}>{row.label}</td>
                      {displayPlans.map((p, ci) => {
                        const value = row.get(p);
                        const isTop = ci === highlightIndex;
                        const theme = cardTheme(p.name, ci);
                        return (
                          <td key={p.id} className={`py-2.5 px-4 ${isTop ? theme.wash : ""}`}>
                            {typeof value === "boolean" ? (
                              value ? <Check className="h-4 w-4 text-emerald-500" /> : <X className={`h-4 w-4 ${TEXT_FAINT}`} />
                            ) : value}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </Fade>
          </section>
        )}

        {/* ============================================================
            FAQ
            ============================================================ */}
        <section id="faq" className={`border-t ${BORDER} pt-10 sm:pt-12 mt-12`}>
          <MicroLabel className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-indigo-400" /> Good to know
          </MicroLabel>
          <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight mb-6`}>Frequently asked questions</h2>
          {/* Two symmetric columns instead of one narrow list — fills the
              section's full width evenly rather than leaving a lopsided
              empty gap on wide screens. Each question is now its own
              hover-lift card instead of a plain divided list row, so this
              section carries the same color/motion language as Plans and
              Compare above it. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[FAQS.slice(0, Math.ceil(FAQS.length / 2)), FAQS.slice(Math.ceil(FAQS.length / 2))].map((col, ci) => (
              <div key={ci} className="flex flex-col gap-3">
                {col.map((f, fi) => (
                  <Fade
                    key={f.q} delay={ci * 0.05 + fi * 0.04}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className={`rounded-xl border ${BORDER_SOFT} bg-gradient-to-br from-indigo-500/[0.03] to-transparent hover:border-indigo-400/40 dark:hover:border-indigo-400/30 transition-colors`}
                  >
                    <details className="group px-4 py-3.5 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
                      <summary className="flex items-center gap-3 cursor-pointer list-none">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold ${ACCENT} bg-indigo-500/10 group-open:bg-indigo-500/20 transition-colors`}>?</span>
                        <span className={`flex-1 text-sm font-medium ${TEXT_PRIMARY}`}>{f.q}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform group-open:rotate-180 ${TEXT_FAINT}`} />
                      </summary>
                      <p className={`text-sm mt-2.5 pl-9 leading-relaxed ${TEXT_SECONDARY}`}>{f.a}</p>
                    </details>
                  </Fade>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================
            CTA
            ============================================================ */}
        <Fade className={`mt-12 rounded-2xl border ${BORDER} bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-transparent overflow-hidden`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-8 sm:p-10">
            <div>
              <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight leading-tight`}>Start free this week.</h2>
              <p className={`mt-4 text-sm leading-relaxed ${TEXT_SECONDARY} max-w-sm`}>
                Sign up yourself — no sales call needed. Invite your team and start tracking leads in minutes.
                30-day free trial, no card required.
              </p>
              <Link href="/register" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors w-fit">
                Start Free →
              </Link>
            </div>
            <div className="sm:border-l sm:pl-8 border-border/60">
              <MicroLabel className="mb-2">Talk to a person</MicroLabel>
              <p className="text-sm font-medium">{GLOBAL_VISTA_BRANDING.supportEmail || "GlobalVistaEducators@gmail.com"}</p>
              <p className="text-sm mt-1 font-medium">{GLOBAL_VISTA_BRANDING.supportPhone || "+91 98145 61099"}</p>
              <p className={`text-xs ${TEXT_FAINT} mt-2`}>We usually reply within a business day.</p>
            </div>
          </div>
        </Fade>

        {/* ============================================================
            FOOTER
            ============================================================ */}
        <footer className={`border-t ${BORDER} mt-14 pt-8`}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 pb-8">
            <div className="sm:col-span-2 sm:pr-8">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/KaizenBMS%20infinity%20logo.png" alt="" className="h-10 w-auto object-contain" />
                <p className={`${SERIF} text-lg font-bold`}>Kaizen <span className={ACCENT}>BMS</span></p>
              </div>
              <p className={`text-sm mt-2 max-w-xs ${TEXT_SECONDARY}`}>CRM, operations, and billing for growing businesses — one workspace, fully configurable.</p>
            </div>
            <div>
              <MicroLabel className="mb-3">Services</MicroLabel>
              <div className="flex flex-col gap-1.5">
                {SERVICES.map((s) => <span key={s.label} className={`text-sm ${TEXT_SECONDARY}`}>{s.label}</span>)}
              </div>
            </div>
            <div>
              <MicroLabel className="mb-3">Account</MicroLabel>
              <div className="flex flex-col gap-1.5">
                <Link href="/register" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors w-fit`}>Start Free</Link>
                <Link href="/login" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors w-fit`}>Sign In</Link>
                <a href="#compare" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors w-fit`}>Compare Plans</a>
                <a href="#faq" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors w-fit`}>FAQ</a>
                <Link href="/blog" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors w-fit`}>Blog</Link>
              </div>
            </div>
          </div>
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t ${BORDER_SOFT}`}>
            <div className="flex items-center gap-5">
              <Link href="/privacy-policy" className={`text-xs ${TEXT_FAINT} ${HOVER_PRIMARY} transition-colors`}>Privacy Policy</Link>
              <Link href="/terms-of-service" className={`text-xs ${TEXT_FAINT} ${HOVER_PRIMARY} transition-colors`}>Terms of Service</Link>
            </div>
            <p className={`text-xs ${TEXT_FAINT}`}>{GLOBAL_VISTA_BRANDING.poweredByLabel} · © {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
