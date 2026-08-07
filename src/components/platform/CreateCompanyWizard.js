"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const STEPS = ["Company", "Admin", "Modules & Plan"];

export default function CreateCompanyWizard({ modules, plans, onClose }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ companyName: "", shortName: "", adminName: "", adminEmail: "", planId: plans[0]?.id || "", moduleIds: [] });
  const [saving, setSaving] = useState(false);

  function toggleModule(id) { setForm((f) => ({ ...f, moduleIds: f.moduleIds.includes(id) ? f.moduleIds.filter((m) => m !== id) : [...f.moduleIds, id] })); }

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/platform/companies/0/provision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Company provisioned. Welcome email sent to admin.");
      onClose(); router.push(`/platform/companies/${data.companyId}`); router.refresh();
    } catch (e) { toast.error(e.message || "Failed to provision company."); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex gap-2 mb-6">{STEPS.map((s, i) => <div key={s} className={`flex-1 text-center text-xs pb-2 border-b-2 ${i <= step ? "border-indigo-500 text-white" : "border-neutral-800 text-neutral-500"}`}>{s}</div>)}</div>

        {step === 0 && (
          <div className="space-y-3">
            <input required placeholder="Company Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
            <input placeholder="Short Name" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <input required placeholder="Admin Full Name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
            <input required type="email" placeholder="Admin Email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
        )}
        {step === 2 && (
          <div>
            <select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} className="w-full mb-4 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm">{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <div className="grid grid-cols-2 gap-2">{modules.map((m) => <label key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800/60 border border-neutral-800 text-sm text-neutral-300 cursor-pointer transition hover:border-neutral-700"><input type="checkbox" checked={form.moduleIds.includes(m.id)} onChange={() => toggleModule(m.id)} className="cursor-pointer" />{m.name}</label>)}</div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm transition hover:bg-neutral-700 cursor-pointer">{step === 0 ? "Cancel" : "Back"}</button>
          {step < 2 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 0 ? !form.companyName : !form.adminEmail} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Next <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button onClick={handleSubmit} disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Provision Company</button>
          )}
        </div>
      </div>
    </div>
  );
}