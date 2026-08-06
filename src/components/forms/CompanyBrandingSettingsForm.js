"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const inputClass = "w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm text-neutral-300 mb-1">{label}</label>
      {children}
      {hint && <p className="text-neutral-600 text-xs mt-1">{hint}</p>}
    </div>
  );
}
function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-neutral-300 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#4f46e5"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded bg-neutral-800 border border-neutral-700 cursor-pointer" />
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="#4f46e5" className={inputClass} />
      </div>
    </div>
  );
}

export default function CompanyBrandingSettingsForm({ initial }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/core/company-branding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success("Branding saved.");
      router.refresh();
    } catch { toast.error("Failed to save branding."); } finally { setSaving(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <p className="text-white font-medium">Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company Logo URL" hint="Used in the sidebar, reports, and emails."><input className={inputClass} value={form.logoUrl} onChange={(e) => setField("logoUrl", e.target.value)} /></Field>
            <Field label="Favicon URL" hint="Shown in the browser tab while inside the workspace."><input className={inputClass} value={form.faviconUrl} onChange={(e) => setField("faviconUrl", e.target.value)} /></Field>
            <Field label="Sidebar Logo Override" hint="Optional — leave blank to reuse the company logo."><input className={inputClass} value={form.sidebarLogoUrl} onChange={(e) => setField("sidebarLogoUrl", e.target.value)} /></Field>
            <Field label="Watermark Logo URL" hint="Faint background mark on printed reports."><input className={inputClass} value={form.watermarkLogoUrl} onChange={(e) => setField("watermarkLogoUrl", e.target.value)} /></Field>
          </div>
        </section>

        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <p className="text-white font-medium">Colors</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColorField label="Primary" value={form.primaryColor} onChange={(v) => setField("primaryColor", v)} />
            <ColorField label="Secondary" value={form.secondaryColor} onChange={(v) => setField("secondaryColor", v)} />
            <ColorField label="Accent" value={form.accentColor} onChange={(v) => setField("accentColor", v)} />
          </div>
        </section>

        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <p className="text-white font-medium">Contact &amp; Support</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => setField("website", e.target.value)} /></Field>
            <Field label="Contact Email"><input type="email" className={inputClass} value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} /></Field>
            <Field label="Contact Phone"><input className={inputClass} value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} /></Field>
            <Field label="Support Email" hint="Shown to your team as the help contact."><input type="email" className={inputClass} value={form.supportEmail} onChange={(e) => setField("supportEmail", e.target.value)} /></Field>
            <Field label="Support Phone"><input className={inputClass} value={form.supportPhone} onChange={(e) => setField("supportPhone", e.target.value)} /></Field>
            <Field label="Address"><input className={inputClass} value={form.address} onChange={(e) => setField("address", e.target.value)} /></Field>
          </div>
        </section>

        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <p className="text-white font-medium">Workspace Personalization</p>
          <Field label="Dashboard Greeting" hint="Shown at the top of the workspace dashboard. Leave blank for the default welcome message."><input className={inputClass} value={form.dashboardGreeting} onChange={(e) => setField("dashboardGreeting", e.target.value)} /></Field>
          <Field label="Company Description"><textarea rows={2} className={inputClass} value={form.companyDescription} onChange={(e) => setField("companyDescription", e.target.value)} /></Field>
          <Field label="Report/Email Footer Text"><input className={inputClass} value={form.footerText} onChange={(e) => setField("footerText", e.target.value)} /></Field>
        </section>

        <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Branding
        </button>
      </form>

      <div className="lg:sticky lg:top-6 self-start">
        <p className="text-neutral-500 text-xs uppercase tracking-wider mb-2">Live Preview</p>
        <div className="rounded-xl border border-neutral-800 overflow-hidden bg-black">
          <div className="px-4 py-3.5 border-b border-neutral-800 flex items-center gap-2.5" style={{ backgroundColor: "#0a0a0a" }}>
            {form.sidebarLogoUrl || form.logoUrl ? (
              <img src={form.sidebarLogoUrl || form.logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
            ) : (
              <div className="h-7 w-7 rounded flex items-center justify-center" style={{ backgroundColor: form.primaryColor || "#4f46e5" }}><Building2 className="h-4 w-4 text-white" /></div>
            )}
            <p className="text-white text-sm font-medium truncate">{form.name || "Your Company"}</p>
          </div>
          <div className="p-3 space-y-1.5">
            <div className="px-3 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: `${form.primaryColor || "#4f46e5"}1a`, border: `1px solid ${form.primaryColor || "#4f46e5"}4d` }}>Dashboard</div>
            <div className="px-3 py-2 rounded-lg text-sm text-neutral-500">Leads</div>
            <div className="px-3 py-2 rounded-lg text-sm text-neutral-500">Reports</div>
            <button type="button" className="w-full mt-2 px-3 py-2 rounded-lg text-white text-sm font-medium cursor-default" style={{ backgroundColor: form.primaryColor || "#4f46e5" }}>Primary Button</button>
          </div>
          {form.dashboardGreeting && <p className="px-4 pb-3 text-neutral-400 text-xs">&ldquo;{form.dashboardGreeting}&rdquo;</p>}
        </div>
      </div>
    </div>
  );
}
