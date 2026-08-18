"use client";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * The platform's own identity, sized as the left panel's focal point rather
 * than a small header logo. The actual uploaded file (public/images/KaizenBMS
 * logo.png) is a full wordmark lockup on an opaque white background — not a
 * transparent icon — so it's presented on a matching white "plate" instead of
 * directly on the dark page background (which would otherwise clip into a
 * visible white rectangle). Since that artwork already spells out the full
 * name and tagline, no redundant "KaizenBMS / Platform" text is duplicated
 * underneath it — the configured logoUrl/name from GLOBAL_VISTA_BRANDING
 * (src/lib/constants/platformBranding.js) is the only source used here,
 * never a hardcoded asset.
 */
export default function AuthBrandPanel({ branding }) {
  return (
    <Link href="/platform-home" className="group mb-10 flex w-fit flex-col">
      {branding.logoUrl ? (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-[28px] p-[1px]"
          style={{ background: `linear-gradient(135deg, ${branding.primaryColor}66, ${branding.accentColor}44, transparent)` }}
        >
          <div
            className="rounded-[27px] bg-white p-4 sm:p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out group-hover:scale-[1.025]"
            style={{ boxShadow: `0 20px 60px -15px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.logoUrl}
              alt={branding.name}
              className="h-auto w-[150px] object-contain sm:w-[190px] lg:w-[220px] xl:w-[240px]"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex h-[120px] w-[120px] sm:h-[150px] sm:w-[150px] items-center justify-center rounded-3xl text-4xl sm:text-5xl font-bold text-white shadow-2xl transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {branding.shortName?.charAt(0) || branding.name?.charAt(0) || "K"}
        </motion.div>
      )}

      {!branding.logoUrl && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mt-4">
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-none">{branding.shortName || branding.name}</p>
          {branding.tagline && <p className="mt-1.5 text-sm text-white/40 tracking-wide">{branding.tagline}</p>}
        </motion.div>
      )}
    </Link>
  );
}
