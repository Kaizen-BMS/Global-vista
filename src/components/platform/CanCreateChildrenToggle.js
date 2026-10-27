"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/components/shared/apiClient";

/**
 * Lets the Platform Operator grant (or revoke) a company's own ability
 * to create child companies directly from its own workspace Settings
 * (see /workspace/settings/schools) instead of only via this Platform
 * Console. Off by default for every company — an explicit per-company
 * grant, never self-service.
 */
export default function CanCreateChildrenToggle({ companyId, enabled }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    setBusy(true);
    try {
      await apiFetch(`/api/platform/companies/${companyId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ canCreateChildCompanies: !enabled }) });
      toast.success(`Can create child companies: ${!enabled ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch { toast.error("Failed."); } finally { setBusy(false); }
  }

  return (
    <label className="relative inline-flex items-center gap-2 cursor-pointer shrink-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Can create child companies</span>
      <span className="relative inline-flex items-center">
        <input type="checkbox" checked={!!enabled} disabled={busy} onChange={toggle} className="sr-only peer" />
        <span className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-indigo-600 block"></span>
        <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></span>
      </span>
    </label>
  );
}
