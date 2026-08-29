"use client";

import { usePathname } from "next/navigation";

import GalaxyBackground from "@/components/common/GalaxyBackground";
import ScrollProgress from "@/components/common/ScrollProgress";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();

  // Pages that should NOT use the public website layout.
  // /crm is the dedicated platform landing page (Website Footer -> here ->
  // Login) — it has its own focused header/CTA/footer, not the multi-page
  // marketing nav, so it's excluded the same way the app itself is.
  // /forms/[slug] is a tenant's own public lead-capture page — it must
  // show THAT company's branding, not Global Vista's marketing nav.
  // /register (AuthFlow-style full-viewport shell) owns its entire page
  // too. /platform-home (the KaizenBMS Platform SaaS landing page,
  // deliberately distinct from Global Vista Educators' identity) is already
  // covered by the "/platform" prefix check above. /blog is the KaizenBMS
  // Platform's own public blog (uses PlatformHomeNavbar) — same reasoning.
  // /pay/[token] is a standalone public payment-request page (opened from a
  // WhatsApp link a lead receives) — it owns its own full-viewport look,
  // same as /forms/[slug].
  const isApplication =
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/platform") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/forms") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/pay");

  if (isApplication) {
    return <>{children}</>;
  }

  return (
    <>
      <GalaxyBackground />

      <ScrollProgress />

      <Navbar />

      <main className="relative z-10">
        {children}
      </main>

      <Footer />
    </>
  );
}