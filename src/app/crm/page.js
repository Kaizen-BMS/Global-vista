import Link from "next/link";
import { ShieldCheck, Zap, Users, BarChart3, Lock, ArrowRight } from "lucide-react";

// Landing page kept in place (not part of the auth/protected migration
// scope) — only its two CTA links updated from /crm/login and
// /crm/forgot-password to the new /login and /forgot-password, so it
// doesn't chain through the redirect stub unnecessarily.
const FEATURES = [
  { icon: Users, title: "Lead Management", desc: "Track every lead from first contact to enrollment with a full activity timeline." },
  { icon: BarChart3, title: "Live Dashboards", desc: "Real-time visibility into pipeline, sources, and counsellor performance." },
  { icon: ShieldCheck, title: "Role-Based Access", desc: "Enterprise RBAC with row-level security — everyone sees exactly what they should." },
  { icon: Lock, title: "Secure by Design", desc: "Encrypted sessions, audit trails, and full activity logging on every action." },
];

export default function CrmLandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">Global Vista Educators</p>
            <p className="text-neutral-500 text-xs">Platform</p>
          </div>
          <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition">
            Sign In <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_#1e1b4b_0%,_#000_60%)]">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-4">The Global Vista Educators<br />Student Success Platform</h1>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">One secure workspace for leads, counselling, applications, and student success.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login" className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition">Sign In</Link>
            <Link href="/forgot-password" className="px-6 py-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-sm font-medium transition">Forgot Password</Link>
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4"><Icon className="h-5 w-5 text-indigo-400" /></div>
              <p className="text-white font-medium mb-1">{title}</p>
              <p className="text-neutral-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-neutral-600 text-xs">© {new Date().getFullYear()} Global Vista Educators.</div>
      </footer>
    </div>
  );
}