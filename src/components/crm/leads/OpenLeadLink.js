"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/components/shared/apiClient";

/**
 * A lead's own detail page is strictly scoped to `company_id =
 * session.company_id` — opening one from GVE's cross-school overview
 * reuses the EXISTING "Switch to Company" mechanism (same as UserMenu's
 * own switcher) rather than a new cross-tenant read path: exit home if
 * already switched somewhere, switch into the lead's own school (skipped
 * entirely for an "Independent" lead, which already lives in GVE's own
 * company), then land on the real page.
 */
export default function OpenLeadLink({ leadId, companyId, homeCompanyId, gveCompanyId, children }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      if (homeCompanyId) {
        const res = await apiFetch("/api/core/session/switch-company", { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to exit the current school first.");
      }
      if (companyId !== gveCompanyId) {
        const res = await apiFetch("/api/core/session/switch-company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to switch into that school.");
      }
      router.push(`/workspace/lead-management/${leadId}`);
      router.refresh();
    } catch (err) { toast.error(err.message); setBusy(false); }
  }

  return (
    <tr onClick={busy ? undefined : open} className={`hover:bg-muted/40 transition cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`}>
      {children}
    </tr>
  );
}
