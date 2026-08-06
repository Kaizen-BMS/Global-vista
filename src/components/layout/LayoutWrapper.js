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
  const isApplication =
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/platform") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/crm");

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