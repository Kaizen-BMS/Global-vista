"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Copy, Check, KeyRound } from "lucide-react";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import { apiFetch } from "@/components/shared/apiClient";
import EmployeeDocumentsPanel from "@/components/users/EmployeeDocumentsPanel";
const TABS = ["Overview", "Documents", "Login History", "Activity"];
export default function EmployeeProfileTabs({ user, loginHistory, activity, isSelf = false, canManage = false }) {
  const [active, setActive] = useState(0);
  const timezone = useTimezone();
  const [resending, setResending] = useState(false);
  // The ORIGINAL password can't ever be resent (it's hashed, never
  // stored) — this always generates a fresh one and tries to email it;
  // shown here directly either way, since the email itself may not
  // arrive depending on this server's SMTP setup.
  const [resent, setResent] = useState(null);
  const [copied, setCopied] = useState(false);

  async function resendLoginDetails() {
    setResending(true);
    try {
      const res = await apiFetch(`/api/core/users/${user.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resend_login_details" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend.");
      setResent({ email: data.email, tempPassword: data.tempPassword, emailSent: data.emailSent });
      toast.success(data.emailSent ? "Login details emailed." : "New password generated — email failed, share it directly.");
    } catch (err) { toast.error(err.message); } finally { setResending(false); }
  }

  async function copyPassword() {
    try { await navigator.clipboard.writeText(resent.tempPassword); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Couldn't copy — select and copy manually."); }
  }

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-border">{TABS.map((t, i) => <button key={t} onClick={() => setActive(i)} className={`px-3 py-2 text-sm border-b-2 cursor-pointer ${active === i ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>)}</div>
      {active === 0 && <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-lg p-3"><p className="text-muted-foreground text-xs">Phone</p><p className="text-foreground text-sm">{user.phone || "—"}</p></div>
          <div className="bg-card border border-border rounded-lg p-3"><p className="text-muted-foreground text-xs">Role</p><p className="text-foreground text-sm">{user.role_name}</p></div>
          <div className="bg-card border border-border rounded-lg p-3"><p className="text-muted-foreground text-xs">Status</p><p className="text-foreground text-sm">{user.status}</p></div>
        </div>

        {canManage && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-foreground text-sm font-medium">Login Details</p>
                <p className="text-muted-foreground text-xs mt-0.5">Didn't get the welcome email, or lost the password? Generate a new one and resend it.</p>
              </div>
              <button type="button" onClick={resendLoginDetails} disabled={resending} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-foreground text-sm font-medium cursor-pointer disabled:opacity-60 shrink-0">
                {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Resend Login Details
              </button>
            </div>
            {resent && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-2">
                <p className="text-foreground text-xs">
                  {resent.emailSent ? "Emailed to " + resent.email + ". " : "Email failed to send — share this directly: "}
                </p>
                <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-3 py-2 text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> New temporary password</span>
                  <span className="flex items-center gap-2">
                    <span className="text-foreground font-mono">{resent.tempPassword}</span>
                    <button type="button" onClick={copyPassword} className="text-indigo-400 hover:text-indigo-300 cursor-pointer" aria-label="Copy password">
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px]">They'll be asked to set their own password the first time they log in.</p>
              </div>
            )}
          </div>
        )}
      </div>}
      {active === 1 && <EmployeeDocumentsPanel userId={user.id} isSelf={isSelf} />}
      {active === 2 && <div className="bg-card border border-border rounded-xl divide-y divide-border">{loginHistory.map((e) => <div key={e.id} className="px-4 py-3 flex justify-between"><span className="text-foreground text-sm capitalize">{e.event.replace("_", " ")}</span><span className="text-muted-foreground text-xs">{formatDateTime(e.created_at, timezone)}</span></div>)}</div>}
      {active === 3 && <div className="bg-card border border-border rounded-xl divide-y divide-border">{activity.map((l) => <div key={l.id} className="px-4 py-3"><p className="text-foreground text-sm">{l.description}</p><p className="text-muted-foreground text-xs">{formatDateTime(l.created_at, timezone)}</p></div>)}</div>}
    </div>
  );
}
