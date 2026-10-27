"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function CreateSchoolForm() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", shortName: "", adminName: "", adminEmail: "", adminPhone: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/core/companies/children", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create school.");
      toast.success(`"${form.companyName}" created. Welcome email sent to its admin.`);
      setForm({ companyName: "", shortName: "", adminName: "", adminEmail: "", adminPhone: "" });
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-3">
      <p className="text-foreground font-medium mb-1">Add a School</p>
      <p className="text-muted-foreground text-xs mb-3">
        Creates a fully independent company with its own isolated data, users, and dashboard — exempt from billing, with every module included automatically.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required placeholder="School Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        <input placeholder="Short Name (optional)" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        <input required placeholder="Admin Full Name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        <input required type="email" placeholder="Admin Email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        <input placeholder="Admin Phone (optional)" value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm sm:col-span-2" />
      </div>
      <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create School
      </button>
    </form>
  );
}
