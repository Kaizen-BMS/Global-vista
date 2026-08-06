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
      <p className="text-neutral-500">Page {page} of {totalPages} · {total} total</p>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => goTo(page - 1)} className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        <button disabled={page >= totalPages} onClick={() => goTo(page + 1)} className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}