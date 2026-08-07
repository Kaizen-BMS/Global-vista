"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function CompanyBrandingForm({ companyId, company }) {
  const router = useRouter();
  const [form, setForm] = useState({ logoUrl: company.logo_url || "", primaryColor: company.primary_color || "#4f46e5", secondaryColor: company.secondary_color || "#171717", website: company.website || "", contactEmail: company.contact_email || "" });
  const [saving, setSaving] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try { await apiFetch(`/api/platform/companies/${companyId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branding: form }) }); toast.success("Branding saved."); router.refresh(); }
    catch { toast.error("Failed."); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
      <p className="text-white font-medium mb-2">Branding</p>
      <input placeholder="Logo URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
      <div className="flex gap-2"><input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-9 w-14 rounded bg-neutral-800 border border-neutral-700" /><input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" /></div>
      <input placeholder="Contact Email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
      <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save Branding</button>
    </form>
  );
}