import Link from "next/link";
import { getSession } from "@/lib/auth";
import { can, isSuperAdmin } from "@/lib/helpers/permissions";
import { MessageSquareWarning, Lightbulb, ArrowRight } from "lucide-react";
import SettingsTabs from "@/components/shared/SettingsTabs";

export default async function SupportFeedbackPage() {
  const session = await getSession();
  const canManageSettings = await can(session, "settings.manage");
  const admin = isSuperAdmin(session);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      {/* Regular employees land here too (Complaints/Ideas need to stay
          reachable for everyone) — the admin-oriented Settings tab bar only
          renders for users who can actually use the other tabs on it. */}
      {canManageSettings && <SettingsTabs />}
      {!canManageSettings && <h2 className="text-lg font-semibold text-foreground mb-1 mt-1">Support & Feedback</h2>}

      <p className="text-muted-foreground text-sm mb-6">
        {admin ? "Review complaints and ideas submitted across your team." : "Raise a concern or share an idea — track it through to resolution."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <Link
          href="/workspace/complaints"
          className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-red-500/30 cursor-pointer"
        >
          <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
            <MessageSquareWarning className="h-5 w-5" />
          </div>
          <div>
            <p className="text-foreground font-medium flex items-center gap-1.5">
              Complaints <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="text-muted-foreground text-sm mt-1">{admin ? "Review, respond to, and resolve every complaint raised across your team." : "Raise a concern and track it through to resolution."}</p>
          </div>
        </Link>

        <Link
          href="/workspace/ideas"
          className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-500/30 cursor-pointer"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-foreground font-medium flex items-center gap-1.5">
              Ideas & Suggestions <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="text-muted-foreground text-sm mt-1">{admin ? "Evaluate, plan, and track ideas submitted by your team." : "Share a suggestion — track its journey from idea to reality."}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
