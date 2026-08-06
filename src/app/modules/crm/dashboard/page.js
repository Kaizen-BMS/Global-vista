import { getSession } from "@/lib/auth";
import { getDashboardStats, getLeadsBySource, getLeadsByService, getRecentLeads } from "@/lib/actions/dashboard";
import { getActivityLogs } from "@/lib/activityLog";
import { getTodaysFollowups } from "@/lib/actions/leadFollowups";
import { Contact2, UserCheck, TrendingUp, Users } from "lucide-react";
import StatCard from "@/components/crm/cards/StatCard";
import RecentActivityCard from "@/components/crm/cards/RecentActivityCard";
import RecentLeadsCard from "@/components/crm/cards/RecentLeadsCard";
import QuickActionsCard from "@/components/crm/cards/QuickActionsCard";
import TodaysFollowupsCard from "@/components/crm/cards/TodaysFollowupsCard";
import LeadSourceChart from "@/components/crm/charts/LeadSourceChart";
import ServiceChart from "@/components/crm/charts/ServiceChart";

export default async function DashboardPage() {
  const session = await getSession();
  const [stats, bySource, byService, recentLeads, recentActivity, todaysFollowups] = await Promise.all([
    getDashboardStats(),
    getLeadsBySource(),
    getLeadsByService(),
    getRecentLeads(),
    getActivityLogs({ limit: 8 }),
    getTodaysFollowups(session),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Welcome, {session?.name}</h1>
      <p className="text-neutral-500 text-sm mb-6">Global Vista Educators CRM overview</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value={stats.totalLeads} icon={Contact2} accent="indigo" />
        <StatCard label="New Leads" value={stats.newLeads} icon={TrendingUp} accent="blue" />
        <StatCard label="Converted" value={stats.converted} icon={UserCheck} accent="green" />
        <StatCard label="Active Users" value={stats.activeUsers} icon={Users} accent="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <LeadSourceChart data={bySource} />
        <ServiceChart data={byService} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentActivityCard logs={recentActivity} />
        </div>
        <div className="space-y-4">
          <TodaysFollowupsCard followups={todaysFollowups} />
          <QuickActionsCard />
        </div>
      </div>

      <div className="mt-4">
        <RecentLeadsCard leads={recentLeads} />
      </div>
    </div>
  );
}