"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Users, Package, Plus } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import CreateCompanyWizard from "@/components/platform/CreateCompanyWizard";

const STATUS_STYLES = { active: "bg-green-500/10 text-green-400 border-green-500/30", suspended: "bg-orange-500/10 text-orange-400 border-orange-500/30", deleted: "bg-red-500/10 text-red-400 border-red-500/30" };

export default function CompaniesPage() {
  const router = useRouter();
  const [data, setData] = useState(null); const [wizardOpen, setWizardOpen] = useState(false); const [busyId, setBusyId] = useState(null);

  useEffect(() => { fetch("/api/platform/companies").then((r) => r.json()).then(setData); }, []);

  async function toggleSuspend(company) {
    setBusyId(company.id);
    const newStatus = company.status === "active" ? "suspended" : "active";
    await apiFetch(`/api/platform/companies/${company.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    toast.success(`Company ${newStatus}.`);
    const fresh = await fetch("/api/platform/companies").then((r) => r.json()); setData(fresh); setBusyId(null);
  }

  if (!data) return <p className="text-neutral-500 text-sm">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl font-semibold text-white">Companies</h1><button onClick={() => setWizardOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"><Plus className="h-4 w-4" />Create Company</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.companies.map((c) => (
          <div key={c.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-indigo-400" /><p className="text-white font-medium">{c.name}</p></div><span className={`text-xs px-2 py-1 rounded-md border ${STATUS_STYLES[c.status]}`}>{c.status}</span></div>
            <div className="flex items-center gap-4 text-neutral-500 text-xs mb-4"><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.user_count}</span><span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{c.enabled_module_count}</span></div>
            <div className="flex items-center gap-3 text-sm"><Link href={`/platform/companies/${c.id}`} className="text-indigo-400 hover:text-indigo-300">Manage</Link><button onClick={() => toggleSuspend(c)} disabled={busyId === c.id} className="text-neutral-400 hover:text-white ml-auto">{c.status === "active" ? "Suspend" : "Reactivate"}</button></div>
          </div>
        ))}
      </div>
      {wizardOpen && <CreateCompanyWizard modules={data.modules} plans={data.plans} onClose={() => setWizardOpen(false)} />}
    </div>
  );
}