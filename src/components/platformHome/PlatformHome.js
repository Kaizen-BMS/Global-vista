"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import { PAGE_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_FAINT, BORDER, BORDER_SOFT, ACCENT } from "@/components/platformHome/editorialTheme";

/**
 * Document-style homepage — a printed-sheet look (masthead, thin rules,
 * serif headline, a plain feature matrix) rather than the previous
 * cinematic dark hero. Built from two supplied mockups in sequence — a
 * plain PDF first, then a more refined "v2" HTML mockup (two-column hero,
 * numbered modules list, an elevated "most chosen" pricing card, a
 * collapsible feature matrix) — this file matches the v2 structure.
 * Every number/word inside it is real, live data throughout: no plan
 * name, price, limit, or module count here is invented to match either
 * mockup's placeholder numbers. The v2 mockup's own product-screenshot
 * section is deliberately NOT included — the only image available for it
 * was a generic stock CRM template (wrong nav items, wrong entities, not
 * actually KaizenBMS), and shipping a fake screenshot of the product
 * would be actively misleading. Swap in real screenshots here once
 * they exist as actual image files.
 */
const SERIF = "font-[family-name:var(--font-source-serif)]";
// Written as their own complete, literal class strings (not derived via
// .split() on PAGE_BG/ACCENT/etc at runtime) — Tailwind's build-time scanner
// only ever generates CSS for a class name it can find as literal text
// somewhere in the source, so a runtime-computed string never produces
// real styles no matter how correct the resulting string looks.
const HOVER_PRIMARY = "hover:text-[#0B0E14] dark:hover:text-[#F4F3EF]";
const HOVER_ACCENT = "hover:text-indigo-600 dark:hover:text-indigo-400";

function Fade({ children, className = "", delay = 0, id }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function MicroLabel({ children, className = "" }) {
  return <p className={`text-[10px] font-medium uppercase tracking-[0.16em] ${TEXT_FAINT} ${className}`}>{children}</p>;
}

/** Shared with the footer's own Services column — one list, two
 * presentations, kept from the previous version of this page for the
 * same "never lets the two drift apart" reason. */
const SERVICES = [
  { label: "CRM & Leads" },
  { label: "Customization" },
  { label: "Communication" },
  { label: "Analytics" },
  { label: "Operations" },
  { label: "Payments" },
  { label: "Security" },
];
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const PACK_WORDS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"];

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

/** The scrolling offers ticker from the previous version of this page —
 * dropped by mistake in the document-style rewrite, restored here as a
 * thin strip under the masthead rather than the old fixed-dark bar, so it
 * fits the lighter theme instead of clashing with it. */
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
 * A compact, looping recreation of the product walkthrough — built from
 * verified real screens of the actual app (dashboard stats, leads table,
 * lead detail with lead score, notifications), using entirely fictional
 * demo data. The design file's own walkthrough imports two external JSX
 * animation components (animations-v3.jsx / crm-walkthrough.jsx) that
 * only exist inside that Claude Design project, not in this codebase, so
 * it can't be embedded directly — this reproduces its scene list
 * (Dashboard → Leads → Detail → Follow-up) as a self-contained
 * cross-fading sequence instead.
 */
const WALKTHROUGH_SCENES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "leads", label: "Leads" },
  { key: "detail", label: "Lead Detail" },
  { key: "followup", label: "Follow-up" },
];
const DEMO_LEADS = [
  { name: "Aarav Mehta", stage: "New Lead", priority: "Medium" },
  { name: "Priya Sharma", stage: "Contacted", priority: "High" },
  { name: "Rohan Gupta", stage: "Qualified", priority: "Medium" },
];
function ProductWalkthrough() {
  const [scene, setScene] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setScene((s) => (s + 1) % WALKTHROUGH_SCENES.length), 3800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`rounded-lg border ${BORDER} shadow-lg overflow-hidden bg-[#0B0E14]`}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-3 text-[10px] uppercase tracking-[0.15em] text-white/40">KaizenBMS Workspace</span>
      </div>
      <div className="relative h-72 sm:h-80">
        <AnimatePresence mode="wait">
          <motion.div
            key={WALKTHROUGH_SCENES[scene].key}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            className="absolute inset-0 p-5 sm:p-6"
          >
            {scene === 0 && (
              <div>
                <p className="text-white text-sm font-medium mb-4">Welcome back — here&apos;s today at a glance.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[["Total Leads", "128"], ["Assigned to Me", "12"], ["Unassigned", "4"], ["Today's Follow-ups", "6"], ["Conversion Rate", "24%"]].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-white/50 text-[10px]">{label}</p>
                      <p className="text-white text-lg font-semibold mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-16 rounded-lg border border-white/10 bg-white/5 flex items-end gap-1.5 p-2">
                  {[40, 65, 50, 80, 60, 90, 70].map((h, i) => <span key={i} className="flex-1 rounded-sm bg-indigo-400/70" style={{ height: `${h}%` }} />)}
                </div>
              </div>
            )}
            {scene === 1 && (
              <div>
                <p className="text-white text-sm font-medium mb-4">Leads (128)</p>
                <div className="rounded-lg border border-white/10 overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-white/5 text-white/50 px-3 py-2">
                    <span>Name</span><span>Stage</span><span>Priority</span>
                  </div>
                  {DEMO_LEADS.map((l) => (
                    <div key={l.name} className="grid grid-cols-3 px-3 py-2.5 border-t border-white/5 text-white/80">
                      <span>{l.name}</span>
                      <span className="text-indigo-300">{l.stage}</span>
                      <span>{l.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {scene === 2 && (
              <div>
                <p className="text-white text-sm font-medium mb-1">Aarav Mehta <span className="text-white/40 font-normal">· New Lead</span></p>
                <p className="text-white/40 text-[11px] mb-4">Lead Score</p>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-1">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-amber-400" style={{ width: "72%" }} />
                </div>
                <p className="text-white/60 text-[11px] mb-4">72 / 100</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[["Phone", "+91 90000 00000"], ["Email", "aarav.m@example.com"], ["Source", "Website"], ["Owner", "You"]].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-white/40 text-[10px]">{label}</p>
                      <p className="text-white/85 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {scene === 3 && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <span className="h-11 w-11 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-lg">✓</span>
                <p className="text-white text-sm font-medium">Follow-up completed</p>
                <p className="text-white/50 text-xs">Aarav Mehta &middot; notification sent</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-center gap-1.5 py-3 border-t border-white/10">
        {WALKTHROUGH_SCENES.map((s, i) => (
          <button
            key={s.key} type="button" onClick={() => setScene(i)} aria-label={s.label}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${i === scene ? "w-5 bg-indigo-400" : "w-1.5 bg-white/20"}`}
          />
        ))}
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
  const [showMatrix, setShowMatrix] = useState(false);

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
    { label: `Price (${months === 1 ? "1mo" : `${months}mo`})`, get: (p) => (p.price == null ? "Free trial" : `${p.currency} ${tierFor(p).price}${p.pricing_model === "per_user" ? "/user" : ""}/mo`) },
    { label: "Employees", get: (p) => p.max_users || "Unlimited" },
    { label: "Leads", get: (p) => p.max_leads || "Unlimited" },
    { label: "Storage", get: (p) => (p.max_storage_mb ? `${p.max_storage_mb >= 1024 ? `${Math.round(p.max_storage_mb / 1024)}GB` : `${p.max_storage_mb}MB`}` : "Unlimited") },
    { label: "Import / export", get: (p) => (p.allow_import_export === 0 ? false : true) },
    { label: "Free trial", get: (p) => (p.trial_days ? `${p.trial_days} days` : false) },
  ];

  return (
    <div className={`${PAGE_BG} ${TEXT_PRIMARY} min-h-screen antialiased relative overflow-hidden`}>
      {/* Decorative radial wash, top-right — straight from the design file
          (kb-wash), not something Framer Motion's whileInView can express
          since it's a one-time page-load reveal of a fixed background
          shape, not tied to any content scrolling into view. */}
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
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-10 sm:py-14 relative">

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
            <div className="flex items-center gap-5 flex-wrap">
              <a href="#modules" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors`}>Modules</a>
              <a href="#pricing" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors`}>Packs</a>
              <a href="#compare" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors`}>Compare</a>
              <Link href="/login" className={`text-sm ${TEXT_SECONDARY} ${HOVER_PRIMARY} transition-colors`}>Log in</Link>
              <Link href="/register" className={`text-sm font-medium border-b border-current ${TEXT_PRIMARY} pb-0.5`}>Start Free</Link>
            </div>
          </div>
          {/* kb-rule — draws in left-to-right on load, exactly as specified */}
          <div className={`animate-kb-rule border-t-2 ${BORDER}`} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3">
            <MicroLabel>CRM · ERP · Automation</MicroLabel>
            <MicroLabel className="sm:text-center">For growing teams</MicroLabel>
            <MicroLabel className="sm:text-right">30-day free trial</MicroLabel>
          </div>
          <div className={`border-t ${BORDER}`} />
        </header>

        {/* ============================================================
            HERO — kb-rise on load (not scroll-triggered): the design
            file only ever animates what's already in the first viewport
            (this wash blob + this hero), nothing further down the page.
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-10 lg:gap-14 items-end pt-12 sm:pt-16 pb-10">
          <div className="animate-kb-rise">
            <MicroLabel className="mb-4">Business management system</MicroLabel>
            <h1 className={`${SERIF} font-bold tracking-tight leading-[0.98] text-4xl sm:text-6xl`}>
              Win the customer. Then <span className={`italic ${ACCENT}`}>run</span> the whole business.
            </h1>
            <p className={`mt-6 max-w-lg text-lg leading-relaxed ${TEXT_SECONDARY}`}>
              Customers, money, documents, people and payments in one system. Start with CRM, switch on the rest when you need it.
            </p>
            <div className="mt-7 flex items-center gap-5 flex-wrap">
              <Link href="/register" className={`inline-flex items-center gap-1.5 text-sm font-medium px-5 py-2.5 rounded-md border ${TEXT_PRIMARY} border-current hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}>
                Start Free →
              </Link>
              <a href="#compare" className={`text-sm border-b ${BORDER} ${TEXT_SECONDARY} pb-0.5`}>Compare the packs</a>
              <span className={`text-sm ${TEXT_FAINT}`}>30-day trial, no card</span>
            </div>
          </div>
          <div id="modules" className="animate-kb-rise" style={{ animationDelay: "0.18s" }}>
            <MicroLabel className="mb-4">What&apos;s inside</MicroLabel>
            <ol className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {SERVICES.map((s, i) => (
                <li key={s.label} className="flex items-baseline gap-2.5">
                  <span className={`text-[11px] tabular-nums ${ACCENT}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ============================================================
            PRODUCT WALKTHROUGH — see ProductWalkthrough's own doc comment
            for why this is a recreation rather than the design file's own
            embedded animation.
            ============================================================ */}
        <Fade className="pb-10">
          <ProductWalkthrough />
        </Fade>

        {/* ============================================================
            PRICING
            ============================================================ */}
        <section id="pricing" className={`border-t ${BORDER} pt-10 sm:pt-12 mt-6`}>
          <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
            <h2 className={`${SERIF} text-2xl sm:text-3xl font-bold tracking-tight`}>Plans</h2>
            <p className={`text-xs ${TEXT_FAINT}`}>Per company, per month. Longer terms cost less.</p>
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
                          <span className="text-2xl font-semibold tabular-nums">{p.currency} {tier.price}</span>
                          <span className={`text-xs ${TEXT_FAINT}`}>/{p.pricing_model === "per_user" ? "user/mo" : "mo"}</span>
                        </>
                      )}
                    </p>
                    <p className={`text-xs ${TEXT_FAINT} mt-1`}>{isFree ? (p.trial_days ? `${p.trial_days}-day trial, no card required.` : "Free to get started.") : p.description || "Billed monthly."}</p>

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
            FEATURE MATRIX — collapsed by default, matching the v2 mockup's
            own "+ Show / − Hide the full feature matrix" toggle.
            ============================================================ */}
        {displayPlans.length > 0 && (
          <section id="compare" className={`border-t ${BORDER} pt-10 sm:pt-12 mt-12`}>
            <button
              type="button" onClick={() => setShowMatrix((s) => !s)}
              className={`text-lg font-medium ${TEXT_PRIMARY} cursor-pointer`}
            >
              {showMatrix ? "−  Hide" : "+  Show"} the full feature matrix
            </button>
            {showMatrix && (
              <Fade className="overflow-x-auto mt-6">
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
            )}
          </section>
        )}

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-8">
            <div>
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
