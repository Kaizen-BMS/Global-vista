"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

/**
 * Platform-Operator-only component (parent gates rendering on
 * isPlatformOperator). This is "view a company's data for support
 * purposes," not "switch my own membership" — see the architecture
 * note in this batch about why a true multi-company-per-user switcher
 * isn't built, since it would contradict the already-frozen tenant model.
 */
export default function CompanySwitcher({ companies, currentCompanyId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function selectCompany(companyId) {
    setSwitching(true);
    try {
      await apiFetch("/api/platform/operator-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      router.push(`/platform/companies/${companyId}`);
      router.refresh();
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  }

  const current = companies.find((c) => c.id === currentCompanyId);

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 hover:text-white">
        <Building2 className="h-3.5 w-3.5" />
        {current?.name || "Select company"}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCompany(c.id)}
              disabled={switching}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              {c.name}
              {c.id === currentCompanyId && <Check className="h-3.5 w-3.5 text-indigo-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}