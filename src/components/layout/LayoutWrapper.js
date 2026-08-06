"use client";

import { usePathname } from "next/navigation";

import GalaxyBackground from "@/components/common/GalaxyBackground";
import ScrollProgress from "@/components/common/ScrollProgress";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();

  // Pages that should NOT use the public website layout
  const isApplication =
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/platform") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

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