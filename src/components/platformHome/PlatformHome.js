"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Minus, Target, SlidersHorizontal, MessageSquare, BarChart3, Building2, CreditCard, ShieldCheck } from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import PlatformHomeNavbar from "@/components/platformHome/PlatformHomeNavbar";
import { PAGE_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_FAINT, BORDER, BORDER_SOFT, ACCENT } from "@/components/platformHome/editorialTheme";

/** Full-bleed hero background video (public/videos/Background vidio.mp4).
 * Autoplays muted/looped/inline (the only way browsers allow autoplay at
 * all). Deliberately no `poster` attribute — a poster image is what the
 * browser shows until the video has buffered its first frame, so on a
 * slower connection it briefly reads as "the wrong image" before swapping
 * to the video. The wrapper's own solid `bg-[#07080B]` fills that gap
 * instead, so the load window is just a plain dark background. Users
 * who've asked the OS for reduced motion get part1.png as a static image
 * instead — no video element is even mounted for them, never just a paused
 * one.
 *
 * Deliberately NOT using a negative z-index to sit "behind" its siblings —
 * framer-motion's transform/opacity on the sibling headline creates its own
 * stacking context, which a negative z-index background can end up painting
 * behind entirely (the bug that made this invisible). Instead this is
 * simply the first child in DOM order with no z-index of its own, and the
 * text content that follows it is explicitly `relative z-10` — plain,
 * unambiguous paint order that no sibling's stacking context can disturb. */
function HeroVideoBackground() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07080B]">
      {reduce ? (
        <Image
          src="/images/part1.png" alt="" fill priority
          className="object-cover object-center opacity-90"
        />
      ) : (
        <video
          autoPlay muted loop playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        >
          <source src="/videos/Background%20vidio.mp4" type="video/mp4" />
        </video>
      )}
      {/* Scrim — a vignette rather than a flat tint, so footage still reads
          as footage at the center while the headline stays legible
          everywhere, in both themes. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#07080B]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}

function MicroLabel({ children, className = "" }) {
  return <p className={`text-[11px] font-medium uppercase tracking-[0.2em] ${TEXT_FAINT} ${className}`}>{children}</p>;
}

/** The "annual report" numbered-section device used throughout — a large
 * faint numeral paired with a tiny uppercase label, establishing rhythm
 * between sections without repeating identical card chrome. */
function Numeral({ n, label }) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <span className={`text-sm font-semibold tabular-nums ${ACCENT}`}>{n}</span>
      <span className={`text-[11px] font-medium uppercase tracking-[0.2em] ${TEXT_FAINT}`}>{label}</span>
    </div>
  );
}

function RevealSection({ id, children, className = "" }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-20 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function EditorialButton({ href, children, primary, external }) {
  const cls = primary
    ? `inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium border ${TEXT_PRIMARY} bg-transparent border-current hover:bg-[#0B0E14] hover:text-white dark:hover:bg-[#F4F3EF] dark:hover:text-[#07080B] transition-colors cursor-pointer`
    : `inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium border ${BORDER} ${TEXT_SECONDARY} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] hover:border-[#0B0E14] dark:hover:border-white/30 transition-colors cursor-pointer`;
  return external ? (
    <a href={href} className={cls}>{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

function formatPostDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Rendered as the fixed navbar's `topBar` — same solid dark strip
 * regardless of scroll state or theme, so it stays legible whether it's
 * sitting over the video hero or the page background, and fully occludes
 * whatever's behind it (no hero video/poster bleed-through). Faster loop
 * than the site's own marquee band, via the dedicated .animate-marquee-fast
 * class — deliberately not touching the shared .animate-marquee speed. */
function OffersMarquee({ offers }) {
  // The loop animation translates by exactly -50% of this track's own
  // width (one copy of `repeated`), so that copy must be at least as wide
  // as the widest screen this renders on — otherwise the untranslated
  // remainder of the track (which is real content, just not enough of it)
  // leaves a visibly empty gap next to the text before the loop restarts.
  // A fixed "duplicate twice" was fine for a long offer list but broke
  // down to exactly this gap with only 1–2 short offers, so repeat count
  // scales inversely with how much text there actually is.
  const repeatCount = Math.max(2, Math.ceil(16 / Math.max(offers.length, 1)));
  const repeated = Array.from({ length: repeatCount }, () => offers).flat();
  return (
    <div className="border-b border-white/10 bg-[#0B0E14] overflow-hidden">
      <div className="flex w-max animate-marquee-fast py-1.5">
        {[...repeated, ...repeated].map((offer, i) => (
          <div key={`${offer.id}-${i}`} className="mx-6 flex shrink-0 items-center gap-3 whitespace-nowrap">
            <span className="text-[11px] uppercase tracking-[0.15em] text-white/80">{offer.text}</span>
            <span className="h-1 w-1 rounded-full bg-indigo-400 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hostinger-style pricing: one duration selector drives every card's price
 * at once (not a per-card toggle), a discount badge appears whenever the
 * chosen term is cheaper than the 1-month price, and a "Compare plans"
 * toggle reveals a full feature-by-feature table. Structure/interaction
 * pattern matches Hostinger's own pricing page; every color/typography
 * choice stays this site's own editorial theme, not Hostinger's palette —
 * same principle as the rest of this app's "borrow the layout, never the
 * brand" rule for competitor-inspired design.
 */
const DURATION_LABELS = { 1: "1 month", 3: "Quarterly", 6: "Half-yearly", 12: "Yearly", 24: "2 years", 36: "3 years" };
function durationLabel(m) { return DURATION_LABELS[m] || `${m} months`; }

/** Shared between the homepage's compact icon grid and the footer's
 * "Services" text column — one list, two presentations, so the two never
 * drift apart the way a full duplicated section would. */
const SERVICES = [
  { icon: Target, label: "CRM & Leads" },
  { icon: SlidersHorizontal, label: "Customization" },
  { icon: MessageSquare, label: "Communication" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Building2, label: "Operations" },
  { icon: CreditCard, label: "Payments" },
  { icon: ShieldCheck, label: "Security" },
];

function HostingerPricingSection({ plans, viewer, offers = [] }) {
  const paidPlans = plans.filter((p) => Number(p.price) > 0);
  // Reuses the existing Offers system (Platform Console → Modules →
  // Offers) rather than a second, parallel "banner" feature — a festival/
  // sale announcement IS exactly what that already models. The most
  // recent active offer gets a bold, standalone banner right above the
  // cards here, in addition to (not instead of) its usual spot in the
  // page-top scrolling strip.
  const pricingBanner = offers[0] || null;
  const activeStates = ["active", "trial", "past_due", "payment_failed"]; // "has some plan already, in some real state" — cancelled/expired/no_subscription don't count as "already has a plan" for CTA purposes

  // Every distinct duration configured on ANY plan, plus the always-available
  // 1-month baseline — a single dropdown that applies across all cards, even
  // though not every plan necessarily has every tier (a plan missing the
  // chosen tier just falls back to its own 1-month price, handled below).
  const durationOptions = useMemo(() => {
    const months = new Set([1]);
    paidPlans.forEach((p) => (p.durationTiers || []).forEach((t) => months.add(t.durationMonths)));
    return [...months].sort((a, b) => a - b);
  }, [paidPlans]);
  const [months, setMonths] = useState(1);
  const [comparing, setComparing] = useState(false);

  function tierFor(plan) {
    if (months === 1) return { months: 1, price: plan.price };
    const tier = (plan.durationTiers || []).find((t) => t.durationMonths === months);
    return tier ? { months, price: tier.price } : { months: 1, price: plan.price };
  }

  /**
   * The CTA has to know who's actually looking: a logged-out visitor goes
   * to log in FIRST (redirect param carries them straight to checkout for
   * this exact plan+term afterward, never back to a generic dashboard); a
   * logged-in Super Admin already on this exact plan sees a disabled
   * "Current Plan"; already on a DIFFERENT active plan sees "Upgrade"; no
   * plan yet sees "Choose Plan" — both of those land on the same
   * subscription page with checkoutPlan/checkoutMonths in the URL, which
   * auto-fires the real checkout the moment it loads (see
   * SubscriptionManager.js's own handling of those params) rather than
   * making them click through the picker again. A logged-in employee who
   * ISN'T the Super Admin can't manage billing at all (same gate the
   * subscription page itself enforces) — sent there anyway, but told
   * plainly rather than hitting a silent 403.
   */
  function ctaFor(plan, tier) {
    const target = `/workspace/settings/subscription?checkoutPlan=${plan.id}&checkoutMonths=${tier.months}`;
    if (!viewer?.loggedIn) return { href: `/login?redirect=${encodeURIComponent(target)}`, label: "Log In to Subscribe" };
    if (!viewer.isSuperAdmin) return { href: "/workspace/settings/subscription", label: "Ask Your Admin" };
    if (viewer.currentPlanId === plan.id && activeStates.includes(viewer.currentPlanState)) return { href: target, label: "Current Plan", disabled: true };
    if (viewer.currentPlanId && activeStates.includes(viewer.currentPlanState)) return { href: target, label: "Upgrade" };
    return { href: target, label: "Choose Plan" };
  }

  if (paidPlans.length === 0) {
    return <p className={`text-sm ${TEXT_SECONDARY}`}>Plans are being configured — check back soon, or start your free trial to get started.</p>;
  }

  return (
    <div>
      {pricingBanner && (
        pricingBanner.image_url ? (
          <div className="mb-8 rounded-xl overflow-hidden border border-indigo-600/30 dark:border-indigo-400/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pricingBanner.image_url} alt={pricingBanner.text || "Special offer"} className="w-full max-h-64 object-cover" />
            {pricingBanner.text && (
              <div className={`bg-indigo-500/10 px-5 py-3 text-center text-sm font-medium ${TEXT_PRIMARY}`}>{pricingBanner.text}</div>
            )}
          </div>
        ) : (
          <div className={`mb-8 rounded-xl border border-indigo-600/30 dark:border-indigo-400/30 bg-indigo-500/10 px-5 py-3.5 text-center text-sm font-medium ${TEXT_PRIMARY}`}>
            {pricingBanner.text}
          </div>
        )
      )}

      {durationOptions.length > 1 && (
        <div className="flex justify-center mb-10">
          <div className={`inline-flex flex-wrap items-center justify-center gap-1 rounded-full border ${BORDER} p-1`}>
            {durationOptions.map((m) => (
              <button
                key={m} type="button" onClick={() => setMonths(m)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  months === m
                    ? "bg-[#0B0E14] text-white dark:bg-[#F4F3EF] dark:text-[#07080B]"
                    : `${TEXT_SECONDARY} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF]`
                }`}
              >
                {durationLabel(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${{ 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" }[paidPlans.length] || "lg:grid-cols-4"}`}>
        {paidPlans.map((p, i) => {
          const tier = tierFor(p);
          const discountPercent = tier.months > 1 && Number(p.price) > 0 ? Math.round((1 - Number(tier.price) / Number(p.price)) * 100) : 0;
          const totalForTerm = Number(tier.price) * tier.months;
          const cta = ctaFor(p, tier);
          return (
            <motion.div
              key={p.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5 }}
              className={`relative rounded-xl border ${i === 1 ? "border-current" : BORDER} p-6 flex flex-col`}
            >
              {discountPercent > 0 && (
                <span className={`absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACCENT} bg-indigo-500/10`}>{discountPercent}% off</span>
              )}
              <p className="text-lg font-medium">{p.name}</p>
              {p.description && <p className={`text-xs mt-1 ${TEXT_SECONDARY}`}>{p.description}</p>}

              <div className="mt-5">
                {discountPercent > 0 && <p className={`text-xs line-through ${TEXT_FAINT}`}>{p.currency} {p.price}/mo</p>}
                <p className="text-3xl font-semibold tabular-nums">
                  {p.currency} {tier.price}<span className={`text-xs font-normal ml-1 ${TEXT_FAINT}`}>/{p.pricing_model === "per_user" ? "user/mo" : "mo"}</span>
                </p>
                <p className={`text-[11px] mt-1 ${TEXT_FAINT}`}>
                  {tier.months === 1 ? "Billed monthly." : `${p.currency} ${totalForTerm.toLocaleString()} billed every ${tier.months} months.`}
                  {!!p.trial_days && ` ${p.trial_days}-day free trial.`}
                </p>
              </div>

              {cta.disabled ? (
                <span className={`mt-5 inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-md border ${BORDER_SOFT} ${TEXT_FAINT} px-4 py-2.5 cursor-default`}>
                  {cta.label}
                </span>
              ) : (
                <Link href={cta.href} className={`mt-5 inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-md border ${TEXT_PRIMARY} border-current px-4 py-2.5 hover:bg-[#0B0E14] hover:text-white dark:hover:bg-[#F4F3EF] dark:hover:text-[#07080B] transition-colors cursor-pointer`}>
                  {cta.label}
                </Link>
              )}

              <ul className={`mt-5 space-y-2 text-xs ${TEXT_SECONDARY} flex-1`}>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 shrink-0" /> {p.max_users ? `${p.max_users} employees` : "Unlimited employees"}</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 shrink-0" /> {p.max_storage_mb ? `${p.max_storage_mb >= 1024 ? `${Math.round(p.max_storage_mb / 1024)}GB` : `${p.max_storage_mb}MB`} storage` : "Unlimited storage"}</li>
                {!!p.maintenance_annual_fee && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 shrink-0" /> {p.currency} {p.maintenance_annual_fee}/yr maintenance</li>}
                <li className="flex items-center gap-2">{p.allow_import_export === 0 ? <Minus className="h-3.5 w-3.5 shrink-0" /> : <Check className="h-3.5 w-3.5 shrink-0" />} Lead import / export</li>
              </ul>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <button onClick={() => setComparing((c) => !c)} className={`inline-flex items-center gap-2 text-sm font-medium rounded-md border ${BORDER} px-5 py-2.5 hover:border-current transition-colors cursor-pointer`}>
          {comparing ? "Hide comparison" : "Compare plans"}
        </button>
      </div>

      {comparing && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-140 text-sm">
            <thead>
              <tr className={`border-b ${BORDER} text-left`}>
                <th className={`py-3 pr-4 font-medium ${TEXT_FAINT}`}>Feature</th>
                {paidPlans.map((p) => <th key={p.id} className="py-3 px-4 font-medium">{p.name}</th>)}
              </tr>
            </thead>
            <tbody className={`divide-y ${BORDER_SOFT}`}>
              {[
                { label: "Registration", get: (p) => p.registration_label || "Self" },
                { label: "Development Cost", get: (p) => p.development_cost_label || "Free" },
                { label: "Installation Cost", get: (p) => p.installation_cost_label || "Free" },
                { label: `Price (${months === 1 ? "1mo" : `${months}mo`})`, get: (p) => `${p.currency} ${tierFor(p).price}${p.pricing_model === "per_user" ? "/user" : ""}/mo` },
                { label: "Annual Maintenance", get: (p) => (p.maintenance_annual_fee ? `${p.currency} ${p.maintenance_annual_fee}/yr` : "None") },
                { label: "Employees", get: (p) => p.max_users || "Unlimited" },
                { label: "Leads", get: (p) => p.max_leads || "Unlimited" },
                { label: "Storage", get: (p) => (p.max_storage_mb ? `${p.max_storage_mb >= 1024 ? `${Math.round(p.max_storage_mb / 1024)}GB` : `${p.max_storage_mb}MB`}` : "Unlimited") },
                { label: "Import / Export", get: (p) => (p.allow_import_export === 0 ? false : true) },
              ].map((row) => (
                <tr key={row.label}>
                  <td className={`py-3 pr-4 ${TEXT_SECONDARY}`}>{row.label}</td>
                  {paidPlans.map((p) => {
                    const value = row.get(p);
                    return (
                      <td key={p.id} className="py-3 px-4">
                        {typeof value === "boolean" ? (value ? <Check className="h-4 w-4" /> : <Minus className={`h-4 w-4 ${TEXT_FAINT}`} />) : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PlatformHome({ plans, posts, offers, viewer }) {
  const hasOffers = offers.length > 0;
  return (
    <div className={`${PAGE_BG} ${TEXT_PRIMARY} min-h-screen overflow-x-hidden antialiased`}>
      <PlatformHomeNavbar topBar={hasOffers ? <OffersMarquee offers={offers} /> : null} />

      {/* ============================================================
          HERO — editorial, asymmetric, video background. Text is fixed
          light-on-dark here regardless of site theme, since a moving video
          needs one consistent, always-legible scrim rather than trying to
          contrast against both light and dark palettes.
          ============================================================ */}
      <header className={`relative min-h-[92vh] flex items-center ${hasOffers ? "pt-40 sm:pt-44" : "pt-32"} pb-20 px-6 sm:px-10 lg:px-16 text-white overflow-hidden`}>
        <HeroVideoBackground />
        <div className="relative z-10 max-w-[1400px] mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6">
            <div className="lg:col-span-7">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">KaizenBMS Platform</p>
                <span className="text-white/20">·</span>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-indigo-300">CRM · ERP · Automation · Analytics</p>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 text-[13vw] leading-[0.92] sm:text-[6.5rem] sm:leading-[0.9] lg:text-[5.5rem] xl:text-[6.25rem] font-semibold tracking-tight text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]"
              >
                One platform.<br />Every part of your<br />business, connected.
              </motion.h1>
            </div>
            <div className="lg:col-span-5 lg:pt-24 flex flex-col justify-end">
              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                className="text-base sm:text-lg leading-relaxed text-white/70">
                Leads, employees, documents, payments, and follow-ups — run from a single workspace, configured to fit your business rather than the other way around.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register" className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-md text-sm font-medium bg-white text-[#07080B] hover:bg-indigo-400 hover:text-white transition-colors cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
                  Start Free <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#platform" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md text-sm font-medium border border-white/30 text-white backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:border-white/50 transition-colors cursor-pointer">
                  Explore Platform
                </a>
              </motion.div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.9 }}
          className="absolute bottom-8 left-6 sm:left-10 lg:left-16 z-10 flex items-center gap-2 text-white/50"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <span className="h-px w-8 bg-white/30" />
        </motion.div>
      </header>

      {/* ============================================================
          PRODUCT STATEMENT — editorial transition after the hero.
          ============================================================ */}
      <RevealSection id="platform" className={`${PAGE_BG} border-t ${BORDER_SOFT} pt-14! sm:pt-16!`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <Numeral n="01" label="The Platform" />
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2"
            >
              <div className={`relative overflow-hidden border ${BORDER}`}>
                <Image
                  src="/images/part1.png" alt="Scattered spreadsheets, contacts, and reports consolidating into one connected KaizenBMS workspace"
                  width={1536} height={1024} sizes="(max-width: 1024px) 100vw, 460px"
                  className="w-full h-auto"
                />
              </div>
              <p className={`mt-3 text-[10px] uppercase tracking-[0.2em] ${TEXT_FAINT}`}>Scattered tools, one workspace</p>
            </motion.div>
          </div>
          <div className="lg:col-span-8">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight leading-[1.15]">
              Built for teams that need less fragmentation and more control.
            </p>
            <p className={`mt-6 max-w-xl text-sm leading-relaxed ${TEXT_SECONDARY}`}>
              Not a CRM bolted onto a spreadsheet, and not a generic ERP with a CRM tab. KaizenBMS is a single platform where lead management, business operations, and billing share one company, one permission system, and one source of truth.
            </p>
          </div>
        </div>
      </RevealSection>

      {/* ============================================================
          02 — SERVICES, compact icon grid (Odoo-style app tiles). The
          previous version of this section spelled out every module as a
          full title + paragraph + tag row, one per screen-width block —
          replaced with a small grid that just shows what exists at a
          glance; the full names still appear in the footer's Services
          column for anyone who wants the list in text form.
          ============================================================ */}
      <RevealSection className={`border-t ${BORDER_SOFT} py-14! sm:py-16!`}>
        <div className="mb-8 sm:mb-10 max-w-2xl">
          <Numeral n="02" label="Everything, connected" />
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight leading-[1.1]">One workspace, every part of the business.</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 7) * 0.05, duration: 0.4 }}
              className={`flex flex-col items-center text-center gap-3 rounded-xl border ${BORDER_SOFT} p-4 sm:p-5 hover:border-current transition-colors`}
            >
              <div className={`h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-lg ${ACCENT} bg-indigo-500/10`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-xs sm:text-[13px] font-medium leading-snug">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </RevealSection>

      {/* ============================================================
          PRICING
          ============================================================ */}
      <RevealSection id="pricing" className={`border-t ${BORDER_SOFT} py-14! sm:py-20!`}>
        <Numeral n="03" label="Pricing" />
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight leading-[1.1] mb-10 max-w-xl">Simple pricing. Choose the plan that fits your team.</h2>
        <HostingerPricingSection plans={plans} viewer={viewer} offers={offers} />
      </RevealSection>

      {/* ============================================================
          BLOG — Platform-Operator-managed, shown only when at least one
          published post exists.
          ============================================================ */}
      {posts.length > 0 && (
        <RevealSection className={`border-t ${BORDER_SOFT} py-14! sm:py-16!`}>
          <div className="flex items-end justify-between mb-8 gap-4">
            <MicroLabel>From the blog</MicroLabel>
            <Link href="/blog" className={`inline-flex items-center gap-1.5 text-xs ${TEXT_SECONDARY} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] transition-colors cursor-pointer shrink-0`}>
              View all posts <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {posts.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}>
                <Link href={`/blog/${p.slug}`} className="group block cursor-pointer">
                  {p.cover_image_url ? (
                    <div className={`relative aspect-[3/2] overflow-hidden border ${BORDER}`}>
                      <Image src={p.cover_image_url} alt={p.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className={`aspect-[3/2] border ${BORDER}`} />
                  )}
                  <p className={`mt-3 text-xs ${TEXT_FAINT}`}>{formatPostDate(p.published_at)}</p>
                  <p className="mt-1.5 text-base font-medium tracking-tight leading-snug group-hover:underline underline-offset-4">{p.title}</p>
                  {p.excerpt && <p className={`mt-1.5 text-sm leading-relaxed ${TEXT_SECONDARY}`}>{p.excerpt}</p>}
                </Link>
              </motion.div>
            ))}
          </div>
        </RevealSection>
      )}

      {/* ============================================================
          FINAL CTA — dramatic, minimal.
          ============================================================ */}
      <RevealSection className={`border-t ${BORDER_SOFT} text-center`}>
        <p className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl mx-auto">
          Build a workspace that works the way you do.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <EditorialButton href="/register" primary>Start Free <ArrowRight className="h-3.5 w-3.5" /></EditorialButton>
          <EditorialButton href="#platform" external>Explore Platform</EditorialButton>
        </div>
      </RevealSection>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className={`border-t ${BORDER}`}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12">
            <div className="lg:col-span-4">
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight">KAIZENBMS</p>
              <p className={`text-sm mt-3 max-w-sm ${TEXT_SECONDARY}`}>CRM, operations, and billing for growing businesses — one workspace, fully configurable.</p>
            </div>
            <div className="lg:col-span-3">
              <MicroLabel className="mb-4">Services</MicroLabel>
              <div className="flex flex-col gap-2.5">
                {SERVICES.map((s) => (
                  <a key={s.label} href="#platform" className={`text-sm ${TEXT_SECONDARY} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] transition-colors cursor-pointer w-fit`}>{s.label}</a>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <MicroLabel className="mb-4">Platform</MicroLabel>
              <div className="flex flex-col gap-2.5">
                {[
                  { href: "#platform", label: "Platform" },
                  { href: "#pricing", label: "Pricing" },
                ].map((l) => (
                  <a key={l.href} href={l.href} className={`text-sm ${TEXT_SECONDARY} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] transition-colors cursor-pointer w-fit`}>{l.label}</a>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <MicroLabel className="mb-4">Account</MicroLabel>
              <div className="flex flex-col gap-2.5">
                <Link href="/register" className={`text-sm ${TEXT_SECONDARY} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] transition-colors cursor-pointer w-fit`}>Start Free</Link>
                <Link href="/login" className={`text-sm ${TEXT_SECONDARY} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] transition-colors cursor-pointer w-fit`}>Sign In</Link>
              </div>
            </div>
          </div>
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t ${BORDER_SOFT}`}>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={GLOBAL_VISTA_BRANDING.logoUrl} alt={GLOBAL_VISTA_BRANDING.name} className="h-9 sm:h-10 w-auto object-contain" />
              <span className={`text-xs ${TEXT_FAINT}`}>{GLOBAL_VISTA_BRANDING.poweredByLabel} · © {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/privacy-policy" className={`text-xs ${TEXT_FAINT} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] transition-colors cursor-pointer`}>Privacy Policy</Link>
              <Link href="/terms-of-service" className={`text-xs ${TEXT_FAINT} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] transition-colors cursor-pointer`}>Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
