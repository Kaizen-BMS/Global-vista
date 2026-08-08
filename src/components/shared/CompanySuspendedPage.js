"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, LogOut } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function CompanySuspendedPage() {
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
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-foreground text-xl font-semibold mb-2">Account Suspended</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your company account has been suspended. Access to the dashboard, CRM, and all other workspace features has been temporarily disabled.
        </p>
        <p className="text-muted-foreground text-sm mt-4">
          Please contact Global Vista Support for assistance.
        </p>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:bg-muted transition cursor-pointer"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );
}
