import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/platform/actions/companies";
import { getActivityLogs } from "@/lib/activityLog";
import { Building2, Package, Users } from "lucide-react";

export default async function PlatformDashboard() {
  const [companies, logs] = await Promise.all([listCompanies(), getActivityLogs({ module: "platform", limit: 8 })]);
  const totalUsers = companies.reduce((sum, c) => sum + c.user_count, 0);
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-6">Platform Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between"><div><p className="text-neutral-500 text-xs">Companies</p><p className="text-white text-2xl font-semibold">{companies.length}</p></div><Building2 className="h-8 w-8 text-indigo-400" /></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between"><div><p className="text-neutral-500 text-xs">Total Users</p><p className="text-white text-2xl font-semibold">{totalUsers}</p></div><Users className="h-8 w-8 text-green-400" /></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between"><div><p className="text-neutral-500 text-xs">Active Modules</p><p className="text-white text-2xl font-semibold">{companies.reduce((s, c) => s + c.enabled_module_count, 0)}</p></div><Package className="h-8 w-8 text-yellow-400" /></div>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <p className="text-white font-medium mb-4">Recent Platform Activity</p>
        {logs.map((l) => <div key={l.id} className="flex justify-between text-sm py-2 border-b border-neutral-800/60 last:border-0"><p className="text-neutral-300">{l.description}</p><span className="text-neutral-600 text-xs">{new Date(l.created_at).toLocaleString()}</span></div>)}
      </div>
    </div>
  );
}