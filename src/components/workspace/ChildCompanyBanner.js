"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

/**
 * Shown on every workspace page while a parent company's Super Admin is
 * "switched into" one of its child companies (session.home_company_id
 * is set) — so it's impossible to lose track of which company's data
 * you're actually looking at. "Exit" reverses the switch exactly (see
 * reissueSessionExitingToHome in auth.js) and returns to the real home
 * identity.
 */
export default function ChildCompanyBanner({ companyName, homeCompanyName }) {
  const [exiting, setExiting] = useState(false);
  const router = useRouter();

  async function exit() {
    setExiting(true);
    try {
      const res = await apiFetch("/api/core/session/switch-company", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to exit.");
      toast.success(`Back to ${homeCompanyName || "your company"}.`);
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setExiting(false); }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-indigo-600 text-white text-sm shrink-0">
      <span className="flex items-center gap-2 min-w-0">
        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Viewing <strong>{companyName}</strong>{homeCompanyName ? ` — part of ${homeCompanyName}` : ""}</span>
      </span>
      <button
        type="button" onClick={exit} disabled={exiting}
        className="flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 transition-colors text-xs font-medium cursor-pointer disabled:opacity-60"
      >
        {exiting && <Loader2 className="h-3 w-3 animate-spin" />} Exit to {homeCompanyName || "home company"}
      </button>
    </div>
  );
}
