"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { PLATFORM_NAV_ITEMS, ALL_NAV_ITEMS } from "@/lib/constants/navItems";
import { getCrmTerms } from "@/lib/helpers/crmTerms";

function humanize(segment) {
  if (/^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment)) return "Details";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs({ scope, isChildCompany = false }) {
  const pathname = usePathname();
  const navItems = scope === "platform" ? PLATFORM_NAV_ITEMS : ALL_NAV_ITEMS;
  const rootHref = scope === "platform" ? "/platform" : "/workspace/dashboard";
  const terms = getCrmTerms(isChildCompany);

  const segments = pathname.split("/").filter(Boolean).filter((s) => s !== scope);
  if (segments.length === 0 || pathname === rootHref) return null;

  const base = scope === "platform" ? "/platform" : "/workspace";
  // Only a crumb that matches a real top-level nav route, or the one
  // entity-detail segment directly under one (the common list -> [id]
  // pattern every resource page follows), is guaranteed to resolve to an
  // actual page — a deeper nested segment (e.g. .../payments/456/receipt)
  // has no page of its own at its own accumulated path and 404s if clicked.
  const firstSegmentIsKnownList = navItems.some((n) => n.href === `${base}/${segments[0]}`);

  let acc = base;
  const crumbs = segments.map((seg, i) => {
    acc += `/${seg}`;
    const known = navItems.find((n) => n.href === acc);
    const isLast = i === segments.length - 1;
    // Breadcrumbs reads ALL_NAV_ITEMS directly (not getVisibleNavItems),
    // so the Lead→Student relabel needs its own override here too.
    const label = known?.href === "/workspace/lead-management" ? terms.plural : known?.label || humanize(seg);
    const linkable = !!known || (i === 1 && firstSegmentIsKnownList);
    return { href: acc, label, isLast, linkable };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
      <Link href={rootHref} className="flex items-center hover:text-foreground transition-colors shrink-0"><Home className="h-3.5 w-3.5" /></Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1.5 min-w-0">
          <ChevronRight className="h-3 w-3 shrink-0" />
          {!c.isLast && c.linkable ? (
            <Link href={c.href} className="hover:text-foreground transition-colors truncate">{c.label}</Link>
          ) : (
            <span className={`truncate ${c.isLast ? "text-foreground font-medium" : ""}`}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
