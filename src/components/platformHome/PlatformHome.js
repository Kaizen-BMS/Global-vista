"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Contact2, MessageSquare, Bell, BarChart3, CreditCard,
  ChevronDown, Sparkles,
} from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import { PAGE_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_FAINT, BORDER, BORDER_SOFT, ACCENT } from "@/components/platformHome/editorialTheme";
import { withGst, GST_LABEL } from "@/lib/helpers/gst";

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

function Fade({ children, className = "", delay = 0, id, style }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
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
  { q: "What does the pricing above actually include?", a: "The price on every plan card already includes GST — nothing added at checkout beyond a coupon discount you choose to apply. Longer commitment terms cost less per month." },
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
  silver: { text: "text-slate-500 dark:text-slate-300", border: "border-slate-400/40 dark:border-slate-300/30", wash: "bg-slate-400/10 dark:bg-slate-300/10", chip: "bg-slate-400/15 text-slate-600 dark:text-slate-300", button: "bg-slate-500 hover:bg-slate-400 text-white" },
  gold: { text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/40 dark:border-amber-400/30", wash: "bg-amber-500/10 dark:bg-amber-400/10", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400", button: "bg-amber-500 hover:bg-amber-400 text-black" },
  diamond: { text: "text-sky-500 dark:text-sky-300", border: "border-sky-400/40 dark:border-sky-300/30", wash: "bg-sky-400/10 dark:bg-sky-300/10", chip: "bg-sky-400/15 text-sky-600 dark:text-sky-300", button: "bg-sky-500 hover:bg-sky-400 text-white" },
};
function planTheme(name) {
  const key = Object.keys(PLAN_THEMES).find((k) => (name || "").toLowerCase().includes(k));
  return key ? PLAN_THEMES[key] : null;
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

/**
 * The hero's "connected products" graphic — a chain of real module chips
 * (each one a feature this app actually has, not a Zoho CRMPlus product
 * like live chat or visitor tracking, which this platform doesn't) linked
 * by dashed connectors, each opening into a small honest preview card.
 * Decorative background circles are plain blurred color, never real or
 * implied customer photos. Desktop-only (hidden below `lg`) — the layout
 * has no legible mobile form, so small screens just get the headline.
 */
const MODULE_NODES = [
  {
    key: "leads", label: "CRM & Leads", icon: Contact2, chip: "bg-indigo-50 text-indigo-600 border-indigo-200",
    preview: (
      <div>
        <p className="text-gray-800 font-medium">Aarav Mehta</p>
        <p className="text-indigo-600 mt-0.5">New Lead · Follow-up today</p>
      </div>
    ),
  },
  {
    key: "messaging", label: "Team Messaging", icon: MessageSquare, chip: "bg-emerald-50 text-emerald-600 border-emerald-200",
    preview: (
      <div>
        <p className="text-gray-400">Ravjeet Kour</p>
        <p className="text-gray-800 mt-0.5">"Following up with the client now 👍"</p>
      </div>
    ),
  },
  {
    key: "notifications", label: "Notifications", icon: Bell, chip: "bg-amber-50 text-amber-600 border-amber-200",
    preview: (
      <div>
        <p className="text-gray-800 font-medium">Payment received</p>
        <p className="text-gray-400 mt-0.5">INR 12,500 · 2m ago</p>
      </div>
    ),
  },
  {
    key: "payments", label: "Payments", icon: CreditCard, chip: "bg-sky-50 text-sky-600 border-sky-200",
    preview: (
      <div>
        <p className="text-gray-800 font-medium">Silver Plan</p>
        <p className="text-gray-400 mt-0.5">INR 470.82 · incl. GST</p>
      </div>
    ),
  },
  {
    key: "reports", label: "Reports", icon: BarChart3, chip: "bg-violet-50 text-violet-600 border-violet-200",
    preview: (
      <div>
        <div className="flex items-end gap-1 h-6 mb-1.5">
          {[40, 70, 55, 85, 60].map((h, i) => <span key={i} className="flex-1 rounded-sm bg-violet-400" style={{ height: `${h}%` }} />)}
        </div>
        <p className="text-gray-400">Conversion 24%</p>
      </div>
    ),
  },
];
const DECOR_BLOBS = [
  { className: "bg-indigo-200/50 dark:bg-indigo-400/10", style: { left: "4%", top: "-10%", width: 90, height: 90 } },
  { className: "bg-amber-200/40 dark:bg-amber-400/10", style: { left: "22%", top: "60%", width: 70, height: 70 } },
  { className: "bg-emerald-200/40 dark:bg-emerald-400/10", style: { left: "48%", top: "-20%", width: 60, height: 60 } },
  { className: "bg-sky-200/50 dark:bg-sky-400/10", style: { left: "68%", top: "55%", width: 80, height: 80 } },
  { className: "bg-violet-200/40 dark:bg-violet-400/10", style: { left: "90%", top: "-8%", width: 70, height: 70 } },
];
function HeroNetwork() {
  return (
    <div className="relative hidden lg:block">
      {DECOR_BLOBS.map((b, i) => (
        <div key={i} aria-hidden="true" className={`absolute rounded-full blur-2xl pointer-events-none ${b.className}`} style={b.style} />
      ))}
      <div className="relative flex items-center">
        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mr-3" />
        {MODULE_NODES.map((n, i) => (
          <div key={n.key} className="flex items-center flex-1">
            {i > 0 && <span className={`flex-1 border-t-2 border-dashed ${BORDER} mx-1`} />}
            <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border whitespace-nowrap ${n.chip}`}>
              <n.icon className="h-3.5 w-3.5" /> {n.label}
            </span>
          </div>
        ))}
        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 ml-3" />
      </div>
      <div className="relative grid grid-cols-5 gap-3 mt-4">
        {MODULE_NODES.map((n, i) => (
          <Fade key={n.key} delay={i * 0.08} className={`rounded-lg border ${BORDER} bg-white dark:bg-white/[0.03] p-3 shadow-sm text-[11px] leading-relaxed ${i % 2 === 1 ? "mt-6" : ""}`}>
            {n.preview}
          </Fade>
        ))}
      </div>
    </div>
  );
}

/** Cycles through short, factual value props consistent with the rest of
 * this page — never a new unverified claim invented just for this strip. */
const HERO_CAPTIONS = [
  "CRM, messaging, and billing — one workspace.",
  "GST-inclusive pricing on every plan, no surprises at checkout.",
  "Role-based access for every team, every branch.",
  "Real-time notifications, tuned per employee.",
];
function CyclingCaption() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % HERO_CAPTIONS.length), 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="inline-flex items-center h-8 px-4 rounded-full bg-[#0B0E14] text-white/90 text-xs overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span key={i} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.35 }}>
          {HERO_CAPTIONS[i]}
        </motion.span>
      </AnimatePresence>
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

/**
 * The real product walkthrough — an actual screen recording
 * (`/videos/Kaizen BMS Walkthrough new.mp4`), not a recreated animation.
 * Deliberately shown WITHOUT player controls — no scrubber, no play
 * button — so it reads as a self-running automated demo (like a looping
 * GIF) rather than "a video someone has to click play on": it starts the
 * moment it scrolls into view, loops forever, and pauses again once
 * scrolled out of view.
 */
function WalkthroughVideo() {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [aspect, setAspect] = useState(16 / 9); // replaced the instant the real video metadata loads

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView) el.play().catch(() => {}); // muted autoplay is allowed everywhere; no controls to fall back on if a browser ever blocks it
    else el.pause();
  }, [inView]);

  return (
    <div ref={ref} className="mx-auto" style={{ maxWidth: 900 }}>
      {/* Monitor bezel — plain hardware grays regardless of site theme
          (a device frame, like Apple's own mockups, isn't something that
          should flip with light/dark mode). */}
      <div className="rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 p-2.5 sm:p-3.5 shadow-[0_35px_60px_-25px_rgba(0,0,0,0.5)] border border-gray-700/60">
        <div className="rounded-md overflow-hidden bg-black" style={{ aspectRatio: aspect }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src="/videos/Kaizen%20BMS%20Walkthrough%20new.mp4"
            className="w-full h-full object-cover"
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
        </div>
        {/* webcam notch */}
        <div className="mx-auto mt-2 sm:mt-2.5 h-1 w-8 rounded-full bg-gray-700" />
      </div>
      {/* stand neck */}
      <div className="mx-auto h-5 sm:h-7 w-4 sm:w-5 bg-gradient-to-b from-gray-700 to-gray-800" style={{ clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0% 100%)" }} />
      {/* base */}
      <div className="mx-auto h-2.5 w-32 sm:w-44 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 shadow-lg" />
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

  const comparisonRows = [
    { label: "Registration", get: (p) => p.registration_label || "Self" },
    { label: "Development cost", get: (p) => p.development_cost_label || "Free" },
    { label: "Installation cost", get: (p) => p.installation_cost_label || "Free" },
    { label: `Price (${months === 1 ? "1mo" : `${months}mo`}, incl. GST)`, get: (p) => (p.price == null ? "Free trial" : `${p.currency} ${withGst(tierFor(p).price)}${p.pricing_model === "per_user" ? "/user" : ""}/mo`) },
    { label: "Employees", get: (p) => p.max_users || "Unlimited" },
    { label: "Leads", get: (p) => p.max_leads || "Unlimited" },
    { label: "Storage", get: (p) => (p.max_storage_mb ? `${p.max_storage_mb >= 1024 ? `${Math.round(p.max_storage_mb / 1024)}GB` : `${p.max_storage_mb}MB`}` : "Unlimited") },
    { label: "Import / export", get: (p) => (p.allow_import_export === 0 ? false : true) },
    { label: "Free trial", get: (p) => (p.trial_days ? `${p.trial_days} days` : false) },
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
              <Link href="/login" className={`text-sm px-3 py-1.5 rounded-full ${TEXT_SECONDARY} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}>Log in</Link>
              <Link href="/register" className="text-sm font-medium px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors">Start Free</Link>
            </div>
          </div>
          {/* kb-rule — draws in left-to-right on load */}
          <div className={`animate-kb-rule border-t-2 ${BORDER}`} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3">
            <MicroLabel>CRM · ERP · Automation</MicroLabel>
            <MicroLabel className="sm:text-center">For growing teams</MicroLabel>
            <MicroLabel className="sm:text-right">30-day free trial</MicroLabel>
          </div>
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
                {["Multi-tenant", "Role-based access", "GST-ready billing"].map((t) => (
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

          <div className="mt-14 animate-kb-rise" style={{ animationDelay: "0.3s" }}>
            <HeroNetwork />
            <div className="hidden lg:flex items-center justify-between mt-6">
              <CyclingCaption />
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
          <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
            <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight`}>Plans</h2>
            <p className={`text-xs ${TEXT_FAINT}`}>Per company, per month, incl. {GST_LABEL}. Longer terms cost less.</p>
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
            <div className={`inline-flex flex-wrap items-center gap-1 rounded-md border ${BORDER} p-1 mt-6`}>
              {durationOptions.map((m) => (
                <button
                  key={m} type="button" onClick={() => setMonths(m)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
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
                const theme = planTheme(p.name);
                return (
                  <Fade
                    key={p.id} delay={i * 0.05}
                    className={`rounded-lg p-5 flex flex-col border ${theme
                      ? `${theme.wash} ${theme.border} ${highlighted ? "shadow-lg sm:-mt-3 sm:pt-8" : ""}`
                      : highlighted
                        ? "bg-indigo-500/6 dark:bg-indigo-400/8 shadow-lg sm:-mt-3 sm:pt-8 border-indigo-600/20 dark:border-indigo-400/20"
                        : BORDER}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`${SERIF} text-4xl leading-none opacity-70 ${theme ? theme.text : highlighted ? ACCENT : TEXT_FAINT}`}>{String(i + 1).padStart(2, "0")}</span>
                      {highlighted && <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${theme ? theme.chip : `${ACCENT} bg-indigo-500/10`}`}>Most chosen</span>}
                    </div>
                    <p className={`${SERIF} text-xl font-bold mt-3 ${theme ? theme.text : TEXT_PRIMARY}`}>{p.name}</p>

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
                    <p className={`text-xs ${TEXT_FAINT} mt-1`}>
                      {isFree
                        ? (p.trial_days ? `${p.trial_days}-day trial, no card required.` : "Free to get started.")
                        : `${p.description ? `${p.description} · ` : ""}Incl. ${GST_LABEL} (${p.currency} ${tier.price} + GST)${p.pricing_model === "per_user" ? " · 5 users min" : ""}`}
                    </p>

                    <div className={`mt-4 pt-4 border-t ${BORDER_SOFT} space-y-1.5 text-sm ${TEXT_SECONDARY} flex-1`}>
                      <p>{p.max_users ? `${p.max_users} users` : "Unlimited users"}</p>
                      <p>{p.max_storage_mb ? `${p.max_storage_mb >= 1024 ? `${Math.round(p.max_storage_mb / 1024)}GB` : `${p.max_storage_mb}MB`} storage` : "Unlimited storage"}</p>
                      <p>{p.allow_import_export === 0 ? "No import/export" : "Import / export included"}</p>
                    </div>

                    {cta.disabled ? (
                      <span className={`mt-5 text-center text-sm ${TEXT_FAINT} border ${BORDER_SOFT} rounded-md px-4 py-2`}>{cta.label}</span>
                    ) : theme ? (
                      <Link href={cta.href} className={`mt-5 text-center text-sm font-medium rounded-md px-4 py-2 transition-colors ${theme.button}`}>
                        {cta.label} →
                      </Link>
                    ) : highlighted ? (
                      <Link href={cta.href} className="mt-5 text-center text-sm font-medium rounded-md px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                        {cta.label} →
                      </Link>
                    ) : (
                      <Link href={cta.href} className={`mt-5 text-center text-sm font-medium rounded-md px-4 py-2 border ${BORDER} ${TEXT_PRIMARY} hover:bg-black/3 dark:hover:bg-white/5 transition-colors`}>
                        {cta.label} →
                      </Link>
                    )}
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
            <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight mb-6`}>Compare every plan</h2>
            <Fade className="overflow-x-auto">
              <table className="w-full min-w-140 text-sm">
                <thead>
                  <tr className={`border-b ${BORDER} text-left`}>
                    <th className={`py-2.5 pr-4 font-medium ${TEXT_FAINT} text-xs uppercase tracking-wide`}>Feature</th>
                    {displayPlans.map((p) => <th key={p.id} className={`py-2.5 px-4 font-medium ${planTheme(p.name)?.text || ""}`}>{p.name}</th>)}
                  </tr>
                </thead>
                <tbody className={`divide-y ${BORDER_SOFT}`}>
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td className={`py-2.5 pr-4 ${TEXT_SECONDARY}`}>{row.label}</td>
                      {displayPlans.map((p) => {
                        const value = row.get(p);
                        return (
                          <td key={p.id} className="py-2.5 px-4">
                            {typeof value === "boolean" ? <span className={TEXT_FAINT}>{value ? "•" : "—"}</span> : value}
                          </td>
                        );
                      })}
                    </tr>
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
          <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight mb-6`}>Frequently asked questions</h2>
          <Fade className={`divide-y ${BORDER_SOFT} max-w-2xl`}>
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <span className={`text-sm font-medium ${TEXT_PRIMARY}`}>{f.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform group-open:rotate-180 ${TEXT_FAINT}`} />
                </summary>
                <p className={`text-sm mt-2.5 leading-relaxed ${TEXT_SECONDARY}`}>{f.a}</p>
              </details>
            ))}
          </Fade>
        </section>

        {/* ============================================================
            CTA
            ============================================================ */}
        <section className={`border-t ${BORDER} pt-10 sm:pt-12 mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8`}>
          <Fade>
            <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight leading-tight`}>Start free this week.</h2>
            <p className={`mt-4 text-sm leading-relaxed ${TEXT_SECONDARY} max-w-sm`}>
              Sign up yourself — no sales call needed. Invite your team and start tracking leads in minutes.
              30-day free trial, no card required.
            </p>
            <Link href="/register" className={`mt-5 inline-flex items-center gap-1.5 text-sm font-medium border-b border-current w-fit ${TEXT_PRIMARY} pb-0.5`}>
              Start Free →
            </Link>
          </Fade>
          <Fade delay={0.1}>
            <MicroLabel className="mb-2">Talk to a person</MicroLabel>
            <p className="text-sm">{GLOBAL_VISTA_BRANDING.supportEmail || "GlobalVistaEducators@gmail.com"}</p>
            <p className="text-sm mt-1">{GLOBAL_VISTA_BRANDING.supportPhone || "+91 98145 61099"}</p>
            <p className={`text-xs ${TEXT_FAINT} mt-1`}>We usually reply within a business day.</p>
          </Fade>
        </section>

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
