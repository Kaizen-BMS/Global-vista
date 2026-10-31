"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Filters already live in the URL (searchParams), so the browser's own
 * back button already restores them — the one thing that was actually
 * getting lost was scroll position, since this page's content is re-
 * rendered from the server on every navigation. Keyed by the full URL
 * (pathname + search) so returning to the exact same filtered view — not
 * just the same route — restores the exact same scroll offset.
 */
export default function ScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `gv:scroll:${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const y = Number(saved);
      if (!Number.isNaN(y)) requestAnimationFrame(() => window.scrollTo(0, y));
    }

    let timer = null;
    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(() => { try { sessionStorage.setItem(key, String(window.scrollY)); } catch {} }, 150);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
