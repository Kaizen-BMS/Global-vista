"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ImageUploadField from "@/components/shared/ImageUploadField";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm text-foreground mb-1">{label}</label>
      {children}
      {hint && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}
    </div>
  );
}
function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-foreground mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#4f46e5"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded bg-muted border border-border cursor-pointer" />
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
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">Identity</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadField label="Company Logo" hint="Used in the sidebar, reports, and emails." value={form.logoUrl} onChange={(v) => setField("logoUrl", v)} uploadUrl="/api/core/company-branding/upload" category="logo" />
            <ImageUploadField label="Favicon" hint="Shown in the browser tab while inside the workspace." value={form.faviconUrl} onChange={(v) => setField("faviconUrl", v)} uploadUrl="/api/core/company-branding/upload" category="favicon" />
            <ImageUploadField label="Sidebar Logo Override" hint="Optional — leave blank to reuse the company logo." value={form.sidebarLogoUrl} onChange={(v) => setField("sidebarLogoUrl", v)} uploadUrl="/api/core/company-branding/upload" category="sidebar_logo" />
            <ImageUploadField label="Watermark Logo" hint="Faint background mark on printed reports." value={form.watermarkLogoUrl} onChange={(v) => setField("watermarkLogoUrl", v)} uploadUrl="/api/core/company-branding/upload" category="watermark" />
            <ImageUploadField label="Login Page Logo" hint="Optional — leave blank to reuse the company logo." value={form.loginLogoUrl} onChange={(v) => setField("loginLogoUrl", v)} uploadUrl="/api/core/company-branding/upload" category="login_logo" />
            <ImageUploadField label="Email Logo" hint="Shown in the header of outbound emails." value={form.emailLogoUrl} onChange={(v) => setField("emailLogoUrl", v)} uploadUrl="/api/core/company-branding/upload" category="email_logo" />
            <ImageUploadField label="Website Logo" hint="Optional — for embedding on your own website." value={form.websiteLogoUrl} onChange={(v) => setField("websiteLogoUrl", v)} uploadUrl="/api/core/company-branding/upload" category="website_logo" />
            <ImageUploadField label="Background Image" hint="Optional — used behind the public lead form and login showcase." value={form.backgroundImageUrl} onChange={(v) => setField("backgroundImageUrl", v)} uploadUrl="/api/core/company-branding/upload" category="background" />
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">Colors</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColorField label="Primary" value={form.primaryColor} onChange={(v) => setField("primaryColor", v)} />
            <ColorField label="Secondary" value={form.secondaryColor} onChange={(v) => setField("secondaryColor", v)} />
            <ColorField label="Accent" value={form.accentColor} onChange={(v) => setField("accentColor", v)} />
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">Contact &amp; Support</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => setField("website", e.target.value)} /></Field>
            <Field label="Contact Email"><input type="email" className={inputClass} value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} /></Field>
            <Field label="Contact Phone"><input className={inputClass} value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} /></Field>
            <Field label="Support Email" hint="Shown to your team as the help contact."><input type="email" className={inputClass} value={form.supportEmail} onChange={(e) => setField("supportEmail", e.target.value)} /></Field>
            <Field label="Support Phone"><input className={inputClass} value={form.supportPhone} onChange={(e) => setField("supportPhone", e.target.value)} /></Field>
            <Field label="Address"><input className={inputClass} value={form.address} onChange={(e) => setField("address", e.target.value)} /></Field>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">Workspace Personalization</p>
          <Field label="Dashboard Greeting" hint="Shown at the top of the workspace dashboard. Leave blank for the default welcome message."><input className={inputClass} value={form.dashboardGreeting} onChange={(e) => setField("dashboardGreeting", e.target.value)} /></Field>
          <Field label="Company Description"><textarea rows={2} className={inputClass} value={form.companyDescription} onChange={(e) => setField("companyDescription", e.target.value)} /></Field>
          <Field label="Report/Email Footer Text"><input className={inputClass} value={form.footerText} onChange={(e) => setField("footerText", e.target.value)} /></Field>
        </section>

        <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Branding
        </button>
      </form>

      <div className="lg:sticky lg:top-6 self-start">
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Live Preview</p>
        <div className="rounded-xl border border-border overflow-hidden bg-black">
          <div className="px-4 py-3.5 border-b border-border flex items-center gap-2.5" style={{ backgroundColor: "#0a0a0a" }}>
            {form.sidebarLogoUrl || form.logoUrl ? (
              <img src={form.sidebarLogoUrl || form.logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
            ) : (
              <div className="h-7 w-7 rounded flex items-center justify-center" style={{ backgroundColor: form.primaryColor || "#4f46e5" }}><Building2 className="h-4 w-4 text-white" /></div>
            )}
            <p className="text-foreground text-sm font-medium truncate">{form.name || "Your Company"}</p>
          </div>
          <div className="p-3 space-y-1.5">
            <div className="px-3 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: `${form.primaryColor || "#4f46e5"}1a`, border: `1px solid ${form.primaryColor || "#4f46e5"}4d` }}>Dashboard</div>
            <div className="px-3 py-2 rounded-lg text-sm text-muted-foreground">Leads</div>
            <div className="px-3 py-2 rounded-lg text-sm text-muted-foreground">Reports</div>
            <button type="button" className="w-full mt-2 px-3 py-2 rounded-lg text-white text-sm font-medium cursor-default" style={{ backgroundColor: form.primaryColor || "#4f46e5" }}>Primary Button</button>
          </div>
          {form.dashboardGreeting && <p className="px-4 pb-3 text-muted-foreground text-xs">&ldquo;{form.dashboardGreeting}&rdquo;</p>}
        </div>
      </div>
    </div>
  );
}
