"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRight, Building2, Contact2, Users } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { Kpi } from "@/components/workspace/dashboard/KpiGrid";

/**
 * The "mixed together" combined view (aggregate KPI tiles across every
 * school) plus the per-school breakdown table, each row able to jump
 * straight into that one school's own dashboard — the "switch between
 * and view individually" half of the same request, right next to the
 * combined numbers instead of needing the separate avatar menu for it.
 */
export default function SchoolsOverview({ schools, totals }) {
  const [switchingId, setSwitchingId] = useState(null);
  const router = useRouter();

  async function switchTo(companyId, companyName) {
    setSwitchingId(companyId);
    try {
      const res = await apiFetch("/api/core/session/switch-company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to switch.");
      toast.success(`Switched to ${companyName}.`);
      router.push("/workspace/dashboard");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSwitchingId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi label="Schools" value={schools.length} icon="building" accent="indigo" />
        <Kpi label="Leads (all schools combined)" value={totals.leadCount.toLocaleString()} icon="contact" accent="blue" />
        <Kpi label="Employees (all schools combined)" value={totals.userCount.toLocaleString()} icon="users" accent="green" />
      </div>

      {schools.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left bg-muted/30">
                <th className="py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">School</th>
                <th className="py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Leads</th>
                <th className="py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Employees</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schools.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-4 text-foreground font-medium">{s.name}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{s.status}</td>
                  <td className="py-2.5 px-4 text-foreground tabular-nums">{s.leadCount.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-foreground tabular-nums">{s.userCount.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button" onClick={() => switchTo(s.id, s.name)} disabled={switchingId !== null}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition cursor-pointer disabled:opacity-50"
                    >
                      {switchingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />} View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
