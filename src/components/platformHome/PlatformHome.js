"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Sheet } from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import PlatformHomeNavbar from "@/components/platformHome/PlatformHomeNavbar";

/**
 * Editorial/cinematic palette — deliberately separate from the workspace
 * app's own semantic-token system (that one is tuned for a dense CRM UI;
 * this page wants a restrained, warm-neutral editorial look). Toggled by
 * the exact same `.dark` class every other theme-aware surface in this app
 * uses (see ThemeProvider) — no second theme system, just different values
 * expressed as Tailwind `dark:` variants throughout.
 */
const PAGE_BG = "bg-[#FAFAF7] dark:bg-[#07080B]";
const TEXT_PRIMARY = "text-[#0B0E14] dark:text-[#F4F3EF]";
const TEXT_SECONDARY = "text-[#5B6270] dark:text-[#8B90A0]";
const TEXT_FAINT = "text-[#9297A3] dark:text-[#5B6270]";
const BORDER = "border-[#E4E3DE] dark:border-white/10";
const BORDER_SOFT = "border-[#ECEBE6] dark:border-white/[0.06]";
const ACCENT = "text-indigo-600 dark:text-indigo-400";

/** Full-bleed hero background video (public/videos/Background vidio.mp4).
 * Autoplays muted/looped/inline (the only way browsers allow autoplay at
 * all) with the real hero screenshot as the `poster` frame so there's never
 * a blank flash while it loads. Users who've asked the OS for reduced
 * motion get that same poster as a static image instead — no video element
 * is even mounted for them, never just a paused one.
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
          poster="/images/part1.png"
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
    ? `inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border ${TEXT_PRIMARY} bg-transparent border-current hover:bg-[#0B0E14] hover:text-white dark:hover:bg-[#F4F3EF] dark:hover:text-[#07080B] transition-colors cursor-pointer`
    : `inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border ${BORDER} ${TEXT_SECONDARY} hover:${TEXT_PRIMARY} hover:border-[#0B0E14] dark:hover:border-white/30 transition-colors cursor-pointer`;
  return external ? (
    <a href={href} className={cls}>{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

export default function PlatformHome({ plans }) {
  return (
    <div className={`${PAGE_BG} ${TEXT_PRIMARY} min-h-screen overflow-x-hidden antialiased`}>
      <PlatformHomeNavbar />

      {/* ============================================================
          HERO — editorial, asymmetric, video background. Text is fixed
          light-on-dark here regardless of site theme, since a moving video
          needs one consistent, always-legible scrim rather than trying to
          contrast against both light and dark palettes.
          ============================================================ */}
      <header className="relative min-h-[92vh] flex items-center pt-32 pb-20 px-6 sm:px-10 lg:px-16 text-white overflow-hidden">
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
                <Link href="/register" className="group inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium bg-white text-[#07080B] hover:bg-indigo-400 hover:text-white transition-colors cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
                  Start Free <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#platform" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium border border-white/30 text-white backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:border-white/50 transition-colors cursor-pointer">
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
          02–08 — CONSOLIDATED. Every topic used to get its own
          min-h-screen-ish section; combined into one dense, scannable list
          (same real content, same real feature names — just laid out like a
          spec sheet instead of a slideshow) so the CRM → Pricing stretch
          takes a fraction of the scroll distance it used to.
          ============================================================ */}
      <RevealSection className={`border-t ${BORDER_SOFT} py-14! sm:py-20!`}>
        <div className="mb-10 sm:mb-14 max-w-2xl">
          <MicroLabel>02 – 08 / Everything, connected</MicroLabel>
          <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-tight leading-[1.1]">One workspace, every part of the business.</h2>
        </div>
        <div className={`border-t ${BORDER}`}>
          {[
            {
              n: "02", label: "CRM", title: "Turn every lead into an organized workflow.",
              desc: "Capture, assign, and track every lead from first contact to conversion — stage, priority, source, and ownership always visible.",
              tags: ["Lead pipeline", "Follow-ups & meetings", "Bulk assignment"],
            },
            {
              n: "03", label: "Customization", title: "Your company. Your fields. Your workflow.",
              desc: "Every company configures its own Lead Form — sections, built-in fields, and unlimited custom fields. An education consultancy and an industrial equipment supplier run the same platform with completely different forms.",
              tags: ["Configurable sections", "Built-in field control", "Unlimited custom fields"],
            },
            {
              n: "04", label: "Activity & Communication", title: "Every conversation, kept in context.",
              desc: "Calls, meetings, notes, and WhatsApp log against the lead they belong to — a single timeline instead of separate tools nobody remembers to check.",
              tags: ["Lead timeline", "Direct & group messaging", "Company announcements", "Real-time notifications"],
            },
            {
              n: "05", label: "Analytics", title: "Know what's moving. Know what needs attention.",
              desc: "Real dashboards for pipeline, revenue, and team performance — broken down by source, stage, owner, and outcome, filterable by any date range.",
              tags: ["Live dashboards", "Reports", "Range filtering"],
            },
            {
              n: "06", label: "Operations", title: "From leads to operations, keep the business connected.",
              desc: "Employees, branches, departments, designations, and documents live in the same platform as your leads — governed by the same permission system.",
              tags: ["Employee management", "Document management", "Role permissions", "Operational reporting"],
            },
            {
              n: "07", label: "Payments & Subscriptions", title: "Billing that fits how you actually get paid.",
              desc: "Plans, trials, and usage limits are fully configurable. Company subscription checkout is powered by BillDesk once a workspace connects its own gateway credentials.",
              tags: ["Configurable plans", "BillDesk checkout", "Manual payments", "Retry & recovery"],
            },
            {
              n: "08", label: "Security & Control", title: "Every company's data, completely isolated.",
              desc: "Every request is scoped server-side to the company that owns it. Access is governed by role, plan, and module — checked on every request.",
              tags: ["Company isolation", "Role-based permissions", "Super Admin controls", "Secure document storage"],
            },
          ].map((row, i) => (
            <motion.div
              key={row.n}
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (i % 4) * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-8 py-7 border-b ${BORDER}`}
            >
              <div className="sm:col-span-3">
                <div className="flex items-baseline gap-2.5">
                  <span className={`text-xs font-semibold tabular-nums ${ACCENT}`}>{row.n}</span>
                  <span className={`text-[11px] font-medium uppercase tracking-[0.15em] ${TEXT_FAINT}`}>{row.label}</span>
                </div>
                <p className="mt-2 text-base font-medium tracking-tight leading-snug">{row.title}</p>
              </div>
              <div className="sm:col-span-9">
                <p className={`text-sm leading-relaxed max-w-2xl ${TEXT_SECONDARY}`}>{row.desc}</p>
                <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1.5">
                  {row.tags.map((t) => (
                    <span key={t} className={`text-[11px] px-2 py-1 border ${BORDER_SOFT} ${TEXT_SECONDARY}`}>{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </RevealSection>

      {/* ============================================================
          INTEGRATIONS — small honest band, not a full mega-section.
          ============================================================ */}
      <RevealSection className={`border-t ${BORDER_SOFT} py-14! sm:py-16!`}>
        <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 border ${BORDER} p-6 sm:p-8`}>
          <div className={`h-11 w-11 shrink-0 border ${BORDER} flex items-center justify-center ${ACCENT}`}><Sheet className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <MicroLabel>Integrations</MicroLabel>
            <p className="text-lg font-medium mt-1.5">Connect the workflows your team already uses.</p>
            <p className={`text-sm mt-1.5 ${TEXT_SECONDARY}`}>KaizenBMS supports spreadsheet synchronization, so leads already living in Google Sheets can flow into your pipeline. Each company sets this up on its own — nothing syncs until you connect it.</p>
          </div>
        </div>
      </RevealSection>

      {/* ============================================================
          PRICING
          ============================================================ */}
      <RevealSection id="pricing" className={`border-t ${BORDER_SOFT} py-14! sm:py-20!`}>
        <Numeral n="09" label="Pricing" />
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight leading-[1.1] mb-10 max-w-xl">Simple pricing. Choose the plan that fits your team.</h2>
        {plans.length === 0 ? (
          <p className={`text-sm ${TEXT_SECONDARY}`}>Plans are being configured — check back soon, or start your free trial to get started.</p>
        ) : (
          <div className={`border-t ${BORDER}`}>
            {plans.map((p, i) => (
              <motion.div
                key={p.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5 }}
                className={`grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-8 items-center py-8 border-b ${BORDER}`}
              >
                <div className="sm:col-span-3">
                  <p className="text-lg font-medium">{p.name}</p>
                  {!!p.trial_days && <p className={`text-xs mt-1 ${ACCENT}`}>{p.trial_days}-day free trial</p>}
                </div>
                <div className="sm:col-span-2">
                  <p className="text-2xl font-semibold tabular-nums">
                    {p.price ? `${p.currency} ${p.price}` : "Free"}
                    {!!p.price && <span className={`text-xs font-normal ml-1 ${TEXT_FAINT}`}>/{p.billing_cycle === "yearly" ? "yr" : "mo"}</span>}
                  </p>
                </div>
                <div className={`sm:col-span-5 flex flex-wrap gap-x-6 gap-y-1 text-xs ${TEXT_SECONDARY}`}>
                  <span>{p.max_users ? `${p.max_users} users` : "Unlimited users"}</span>
                  <span>{p.max_leads ? `${p.max_leads} leads` : "Unlimited leads"}</span>
                  <span>{p.max_storage_mb ? `${(p.max_storage_mb / 1024).toFixed(1)} GB storage` : "Unlimited storage"}</span>
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  <Link href="/register" className={`inline-flex items-center gap-1.5 text-sm font-medium ${ACCENT} hover:underline underline-offset-4 cursor-pointer`}>
                    Get Started <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </RevealSection>

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
            <div className="lg:col-span-6">
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight">KAIZENBMS</p>
              <p className={`text-sm mt-3 max-w-sm ${TEXT_SECONDARY}`}>CRM, operations, and billing for growing businesses — one workspace, fully configurable.</p>
            </div>
            <div className="lg:col-span-3">
              <MicroLabel className="mb-4">Platform</MicroLabel>
              <div className="flex flex-col gap-2.5">
                {[
                  { href: "#platform", label: "Platform" },
                  { href: "#pricing", label: "Pricing" },
                ].map((l) => (
                  <a key={l.href} href={l.href} className={`text-sm ${TEXT_SECONDARY} hover:${TEXT_PRIMARY} transition-colors cursor-pointer w-fit`}>{l.label}</a>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <MicroLabel className="mb-4">Account</MicroLabel>
              <div className="flex flex-col gap-2.5">
                <Link href="/register" className={`text-sm ${TEXT_SECONDARY} hover:${TEXT_PRIMARY} transition-colors cursor-pointer w-fit`}>Start Free</Link>
                <Link href="/login" className={`text-sm ${TEXT_SECONDARY} hover:${TEXT_PRIMARY} transition-colors cursor-pointer w-fit`}>Sign In</Link>
              </div>
            </div>
          </div>
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t ${BORDER_SOFT}`}>
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={GLOBAL_VISTA_BRANDING.logoUrl} alt={GLOBAL_VISTA_BRANDING.name} className="h-6 w-6 rounded object-contain" />
              <span className={`text-xs ${TEXT_FAINT}`}>{GLOBAL_VISTA_BRANDING.poweredByLabel} · © {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
