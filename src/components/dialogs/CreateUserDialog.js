"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2, Check, ArrowRight } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import EmployeeDocumentsPanel from "@/components/users/EmployeeDocumentsPanel";

const STEPS = ["Employee Info", "Documents", "Finish"];
const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function Stepper({ step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors ${i === step ? "bg-indigo-600 text-white" : i < step ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {i < step ? <Check className="h-3 w-3" /> : i + 1}
          </span>
          <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
          {i < STEPS.length - 1 && <div className="w-6 sm:w-10 h-px bg-border shrink-0" />}
        </div>
      ))}
    </div>
  );
}

export default function CreateUserDialog({ roles, onClose }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", roleId: "", sendWelcome: true });
  const [saving, setSaving] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/core/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create user."); return; }
      toast.success("User created.");
      setCreatedUser({ id: data.user.id, name: form.name });
      setStep(1);
      router.refresh();
    } catch { toast.error("Something went wrong."); } finally { setSaving(false); }
  }

  function finish() {
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={step === 0 ? onClose : undefined}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
          <Stepper step={step} />
          <button type="button" onClick={step === 0 ? onClose : finish} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <form id="create-user-form" onSubmit={handleCreate} className="space-y-3">
              <p className="text-foreground font-medium mb-1">Employee Information</p>
              <input required placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className={inputClass}>
                <option value="">Select role</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-foreground pt-1">
                <input type="checkbox" checked={form.sendWelcome} onChange={(e) => setForm({ ...form, sendWelcome: e.target.checked })} /> Send welcome email
              </label>
            </form>
          )}

          {step === 1 && createdUser && (
            <div>
              <p className="text-foreground font-medium mb-1">Documents for {createdUser.name}</p>
              <p className="text-muted-foreground text-sm mb-4">Upload now, or skip and add them later from the employee&rsquo;s profile.</p>
              <EmployeeDocumentsPanel userId={createdUser.id} isSelf={false} />
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-10">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
                <Check className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-foreground font-medium text-lg">{createdUser?.name} is all set</p>
              <p className="text-muted-foreground text-sm mt-1">You can manage their documents anytime from their profile.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          {step === 0 && (
            <button type="submit" form="create-user-form" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create &amp; Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {step === 1 && (
            <>
              <button type="button" onClick={() => setStep(2)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm cursor-pointer">Skip for now</button>
              <button type="button" onClick={() => setStep(2)} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer">Continue <ArrowRight className="h-4 w-4" /></button>
            </>
          )}
          {step === 2 && (
            <button type="button" onClick={finish} className="btn-brand px-5 py-2.5 rounded-lg text-white text-sm font-medium cursor-pointer">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
