"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthShowcase from "@/components/auth/AuthShowcase";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";

export default function AuthShell({ children, branding = GLOBAL_VISTA_BRANDING, maxWidth = "max-w-sm" }) {
  return (
    <div className="min-h-screen flex bg-[#05050c]">
      <div className="flex flex-1 lg:flex-none lg:w-[38%] xl:w-[36%] min-w-0 items-center justify-center px-6 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`w-full ${maxWidth}`}
        >
          {/* Shared by both Login and Register (this component) — the
              platform identity here links back to the KaizenBMS Platform
              marketing site, not a dead-end static logo. */}
          <Link href="/platform-home" className="flex items-center gap-3 mb-10 group w-fit">
            {branding.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={branding.logoUrl} alt={branding.name} className="h-10 w-10 rounded-xl object-contain transition-transform group-hover:scale-105" />
            ) : (
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold transition-transform group-hover:scale-105" style={{ backgroundColor: branding.primaryColor }}>
                {branding.name?.charAt(0) || "G"}
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{branding.name}</p>
              {branding.tagline && <p className="text-white/40 text-[11px] leading-tight">{branding.tagline}</p>}
            </div>
          </Link>
          {children}
        </motion.div>
      </div>
      <AuthShowcase branding={branding} />
    </div>
  );
}
