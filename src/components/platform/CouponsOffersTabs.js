"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/platform/coupons", label: "Coupons" },
  { href: "/platform/offers", label: "Offers" },
];

/** Coupons and Offers used to be two separate sidebar entries — merged into
 * one ("Coupons & Offers", still pointing at /platform/coupons) with this
 * tab strip switching between the two underlying pages, same pattern as
 * SettingsTabs.js. */
export default function CouponsOffersTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`text-sm px-3 py-1.5 rounded-md whitespace-nowrap transition ${pathname === t.href ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/30" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
