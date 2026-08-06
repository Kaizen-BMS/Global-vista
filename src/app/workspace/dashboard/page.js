import { getSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getActivityLogs } from "@/lib/activityLog";
import { Users, ShieldCheck, Lock } from "lucide-react";
import StatCard from "@/components/cards/StatCard";
import RecentActivityCard from "@/components/cards/RecentActivityCard";
import QuickActionsCard from "@/components/cards/QuickActionsCard";

export default async function DashboardPage() {
  const session = await getSession();
  const [stats, recentActivity] = await Promise.all([getDashboardStats(session), getActivityLogs({ limit: 8, companyId: session.company_id })]);
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Welcome, {session?.name}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-6">
        <StatCard
  label="Active Users"
  value={stats.activeUsers}
  icon="users"
  accent="indigo"
/>

<StatCard
  label="Roles"
  value={stats.roles}
  icon="shield"
  accent="green"
/>

<StatCard
  label="Locked Accounts"
  value={stats.lockedAccounts}
  icon="lock"
  accent="yellow"
/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><RecentActivityCard logs={recentActivity} /></div>
        <QuickActionsCard />
      </div>
    </div>
  );
}