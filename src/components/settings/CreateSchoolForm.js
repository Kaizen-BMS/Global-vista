"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Copy, Check, KeyRound, LogIn } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function CreateSchoolForm() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", shortName: "", adminName: "", adminEmail: "", adminPhone: "" });
  const [saving, setSaving] = useState(false);
  // Shown after a successful create — provisionCompany always returns a
  // temporary password for the new admin, but the welcome email that's
  // supposed to carry it depends on this app's SMTP credentials actually
  // working, which they currently don't (confirmed failing at build
  // time). Surfacing it here directly means the school can always log in
  // immediately regardless of whether that email ever arrives.
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/core/companies/children", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create school.");
      toast.success(`"${form.companyName}" created.`);
      setCreated({ companyName: form.companyName, adminEmail: form.adminEmail, temporaryPassword: data.temporaryPassword || null });
      setForm({ companyName: "", shortName: "", adminName: "", adminEmail: "", adminPhone: "" });
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Couldn't copy — select and copy manually."); }
  }

  return (
    <div className="space-y-3">
      {created && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2">
          <p className="flex items-center gap-1.5 text-foreground text-sm font-semibold">
            <LogIn className="h-4 w-4 text-emerald-500" /> "{created.companyName}" is ready — here's how its admin logs in
          </p>
          <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-3 py-2 text-sm">
            <span className="text-muted-foreground">Login email</span>
            <span className="text-foreground font-medium">{created.adminEmail}</span>
          </div>
          {created.temporaryPassword ? (
            <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-3 py-2 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Temporary password</span>
              <span className="flex items-center gap-2">
                <span className="text-foreground font-mono">{created.temporaryPassword}</span>
                <button type="button" onClick={copyPassword} className="text-indigo-400 hover:text-indigo-300 cursor-pointer" aria-label="Copy password">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">A welcome email with login details was sent — check with the school if it doesn't arrive.</p>
          )}
          <p className="text-muted-foreground text-xs">
            Share this with the school directly — a welcome email was also attempted, but may not arrive depending on this server's email setup. They'll be asked to set their own password the first time they log in at <span className="text-foreground">/login</span>.
          </p>
          <button type="button" onClick={() => setCreated(null)} className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer">Dismiss</button>
        </div>
      )}

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
    </div>
  );
}
