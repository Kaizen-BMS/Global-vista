"use client";
import { motion } from "framer-motion";
import AuthShowcase from "@/components/auth/AuthShowcase";
import { GLOBAL_VISTA_AUTH_BRANDING } from "@/lib/constants/authBranding";

export default function AuthShell({ children, branding = GLOBAL_VISTA_AUTH_BRANDING }) {
  return (
    <div className="min-h-screen flex bg-[#05050c]">
      <div className="flex flex-1 lg:flex-none lg:w-[38%] xl:w-[36%] min-w-0 items-center justify-center px-6 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-3 mb-10">
            {branding.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={branding.logoUrl} alt={branding.name} className="h-10 w-10 rounded-xl object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold" style={{ backgroundColor: branding.primaryColor }}>
                {branding.name?.charAt(0) || "G"}
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{branding.name}</p>
              {branding.tagline && <p className="text-white/40 text-[11px] leading-tight">{branding.tagline}</p>}
            </div>
          </div>
          {children}
        </motion.div>
      </div>
      <AuthShowcase branding={branding} />
    </div>
  );
}
