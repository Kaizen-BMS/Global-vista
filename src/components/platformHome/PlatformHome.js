"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, Contact2, Users, FileText, CreditCard, Layers, BarChart3, Zap, Bell, ShieldCheck,
  Building2, KeyRound, Lock, TrendingUp, CheckCircle2, Sparkles,
} from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import PlatformHomeNavbar from "@/components/platformHome/PlatformHomeNavbar";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const FEATURES = [
  { icon: Contact2, title: "CRM & Lead Management", desc: "Capture, assign, and track every lead from first contact to conversion." },
  { icon: Users, title: "Employee Management", desc: "Roles, departments, branches, and multi-role permission switching." },
  { icon: FileText, title: "Documents", desc: "Private, tenant-isolated document storage with signed access." },
  { icon: CreditCard, title: "Payments", desc: "Negotiated pricing, installments, partial payments, full history." },
  { icon: Layers, title: "Subscriptions", desc: "Plans, modules, trials, and usage limits — fully configurable." },
  { icon: BarChart3, title: "Reports", desc: "Real-time dashboards for revenue, pipeline, and team performance." },
  { icon: Zap, title: "Automation", desc: "Follow-up reminders, notifications, and lead sync — on autopilot." },
  { icon: Bell, title: "Notifications", desc: "The right person notified at the right moment, every time." },
  { icon: KeyRound, title: "Role Management", desc: "Fine-grained, company-scoped permissions for every team member." },
];

const WORKFLOW = ["Capture Lead", "Assign Lead", "Follow-up", "Convert", "Payment", "Documents", "Reporting"];

const DEMO_LEADS = [
  { name: "Rahul Sharma", stage: "Follow-up", value: "₹75,000" },
  { name: "Priya Verma", stage: "Converted", value: "₹1,20,000" },
  { name: "Amit Singh", stage: "New", value: "₹45,000" },
];

function Section({ id, children, className = "" }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      className={`max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function Eyebrow({ children }) {
  return <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">{children}</p>;
}

export default function PlatformHome({ plans }) {
  return (
    <div className="bg-[#05060f] text-white min-h-screen overflow-x-hidden">
      <PlatformHomeNavbar />

      {/* HERO */}
      <section className="relative pt-40 pb-24 sm:pt-48 sm:pb-32 px-5 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[10%] h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs mb-6">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Now managing leads, payments &amp; teams for growing businesses
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            One Platform.<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Complete Business Control.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-white/50 text-lg max-w-2xl mx-auto">
            KaizenBMS Platform helps companies manage leads, customers, employees, documents, payments, follow-ups, and business operations from one intelligent CRM platform.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="group flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:-translate-y-0.5">
              Start Free Trial <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#features" className="px-6 py-3.5 rounded-xl border border-white/15 hover:border-white/30 text-white text-sm font-medium transition">
              Explore Platform
            </a>
          </motion.div>
        </div>

        {/* ANIMATED PLATFORM PREVIEW — clearly-labeled demo data, not live company data */}
        <motion.div id="platform" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
          className="max-w-5xl mx-auto mt-20 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-black/40">
          <p className="text-white/30 text-[11px] mb-4 text-center">Demo preview — illustrative data only</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total Leads", value: "1,284", icon: Contact2, accent: "text-indigo-400 bg-indigo-500/10" },
              { label: "Revenue Collected", value: "₹42.6L", icon: TrendingUp, accent: "text-emerald-400 bg-emerald-500/10" },
              { label: "Active Users", value: "37", icon: Users, accent: "text-sky-400 bg-sky-500/10" },
              { label: "Conversion Rate", value: "28.4%", icon: BarChart3, accent: "text-amber-400 bg-amber-500/10" },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i, duration: 0.4 }}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${c.accent}`}><c.icon className="h-4 w-4" /></div>
                <p className="text-white/40 text-[11px]">{c.label}</p>
                <p className="text-white text-lg font-semibold tabular-nums">{c.value}</p>
              </motion.div>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
            <p className="text-white/40 text-xs mb-2">Pipeline Activity</p>
            <div className="space-y-1.5">
              {DEMO_LEADS.map((l, i) => (
                <motion.div key={l.name} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 * i }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] text-sm">
                  <span className="text-white/80">{l.name}</span>
                  <span className="text-white/40 text-xs">{l.stage}</span>
                  <span className="text-emerald-400 text-xs font-medium">{l.value}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <Section id="features">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Eyebrow>Everything in one place</Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-semibold">Built for how growing businesses actually run</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08, duration: 0.4 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3"><f.icon className="h-5 w-5" /></div>
              <p className="text-white font-medium mb-1">{f.title}</p>
              <p className="text-white/40 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* WORKFLOW */}
      <Section id="workflow" className="border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Eyebrow>The business workflow</Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-semibold">From first contact to closed business</h2>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {WORKFLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 text-sm whitespace-nowrap">
                {step}
              </motion.div>
              {i < WORKFLOW.length - 1 && <ArrowRight className="h-4 w-4 text-white/20 shrink-0" />}
            </div>
          ))}
        </div>
      </Section>

      {/* SECURITY / MULTI-TENANT */}
      <Section className="border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <Eyebrow>Built for multi-tenant scale</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-semibold mb-5">Every company&apos;s data, completely isolated</h2>
            <div className="space-y-4">
              {[
                { icon: Building2, title: "Company Isolation", desc: "Every request is scoped server-side — no company ever sees another's data." },
                { icon: KeyRound, title: "Role-Based Permissions", desc: "Fine-grained, per-role access control, enforced on every request." },
                { icon: ShieldCheck, title: "Super Admin Controls", desc: "Company Super Admins govern their own workspace end-to-end." },
                { icon: Lock, title: "Secure Document Storage", desc: "Private, signed access — never publicly exposed." },
              ].map((s) => (
                <div key={s.title} className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-white/5 text-indigo-400 flex items-center justify-center"><s.icon className="h-4.5 w-4.5" /></div>
                  <div>
                    <p className="text-white text-sm font-medium">{s.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent p-8 flex flex-col items-center justify-center text-center">
            <ShieldCheck className="h-16 w-16 text-indigo-400 mb-4" />
            <p className="text-white font-medium">Subscription-Enforced Access</p>
            <p className="text-white/40 text-sm mt-1.5">Modules, users, leads, and storage — all governed by your plan, checked server-side on every request.</p>
          </motion.div>
        </div>
      </Section>

      {/* PRICING */}
      <Section id="pricing" className="border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Eyebrow>Simple, transparent pricing</Eyebrow>
          <h2 className="text-3xl sm:text-4xl font-semibold">Choose the plan that fits your team</h2>
        </div>
        {plans.length === 0 ? (
          <p className="text-center text-white/40 text-sm">Plans are being configured — check back soon, or start your free trial to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {plans.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col hover:border-indigo-500/30 transition-all">
                <p className="text-white font-medium text-lg">{p.name}</p>
                <p className="text-white text-3xl font-semibold mt-3">
                  {p.price ? `${p.currency} ${p.price}` : "Free"}
                  {p.price && <span className="text-white/40 text-sm font-normal">/{p.billing_cycle === "yearly" ? "yr" : "mo"}</span>}
                </p>
                {!!p.trial_days && <p className="text-indigo-400 text-xs mt-1">{p.trial_days}-day free trial</p>}
                <div className="mt-5 space-y-2.5 flex-1">
                  {[
                    p.max_users ? `${p.max_users} users` : "Unlimited users",
                    p.max_leads ? `${p.max_leads} leads` : "Unlimited leads",
                    p.max_storage_mb ? `${(p.max_storage_mb / 1024).toFixed(1)} GB storage` : "Unlimited storage",
                  ].map((line) => (
                    <div key={line} className="flex items-center gap-2 text-white/60 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> {line}</div>
                  ))}
                </div>
                <Link href="/register" className="mt-6 text-center py-2.5 rounded-lg border border-white/15 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-white text-sm font-medium transition">
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* CTA */}
      <Section className="border-t border-white/5">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent p-10 sm:p-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold mb-3">Start your company today.</h2>
          <p className="text-white/50 max-w-xl mx-auto mb-8">Set up your KaizenBMS Platform workspace in minutes — no credit card required for the free trial.</p>
          <Link href="/register" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]">
            Start Free Trial <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={GLOBAL_VISTA_BRANDING.logoUrl} alt={GLOBAL_VISTA_BRANDING.name} className="h-7 w-7 rounded-md object-contain" />
            <span className="text-white/60 text-sm">KaizenBMS Platform</span>
          </div>
          <p className="text-white/30 text-xs">{GLOBAL_VISTA_BRANDING.poweredByLabel} · © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
