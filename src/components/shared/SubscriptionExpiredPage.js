"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, LogOut } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { formatDate } from "@/lib/helpers/dateFormat";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";

export default function SubscriptionExpiredPage({ companyName, planName, endsAt, timezone = "UTC" }) {
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/api/core/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <CalendarClock className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-foreground text-xl font-semibold mb-2">Subscription Expired</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {companyName}'s subscription has expired. Access to the dashboard, CRM, and all other workspace features has been disabled.
        </p>
        <div className="bg-card border border-border rounded-lg p-4 text-left text-sm mb-4">
          <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Plan</span><span className="text-foreground">{planName || "—"}</span></div>
          <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Expired</span><span className="text-foreground">{endsAt ? formatDate(endsAt, timezone) : "—"}</span></div>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Your subscription has expired. Please contact the platform administrator to renew your plan.
        </p>
        <div className="flex items-center justify-center gap-2">
          {GLOBAL_VISTA_BRANDING.supportEmail ? (
            <a href={`mailto:${GLOBAL_VISTA_BRANDING.supportEmail}`} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition cursor-pointer">
              Contact Support
            </a>
          ) : (
            <span className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm">Contact your platform administrator</span>
          )}
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground text-sm font-medium transition cursor-pointer">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
