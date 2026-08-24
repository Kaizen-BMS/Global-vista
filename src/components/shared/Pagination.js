"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, pageSize, total }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  function goTo(p) { const params = new URLSearchParams(searchParams.toString()); params.set("page", p); router.push(`${pathname}?${params.toString()}`); }
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <p className="text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => goTo(page - 1)} aria-label="Previous page" className="p-2 rounded-lg bg-card border border-border text-foreground/80 hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
        <button disabled={page >= totalPages} onClick={() => goTo(page + 1)} aria-label="Next page" className="p-2 rounded-lg bg-card border border-border text-foreground/80 hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}