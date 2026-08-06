import Link from "next/link";
import { getSession } from "@/lib/auth";
import { canAny } from "@/lib/helpers/permissions";
import { Contact2, Users, ListTodo, FileText, ScrollText, LayoutDashboard } from "lucide-react";

const REPORTS = [
  { href: "/workspace/reports/leads", label: "Leads Report", icon: Contact2, permission: "leads.view", description: "Every lead with source, service, stage, and assignment." },
  { href: "/workspace/reports/users", label: "Users Report", icon: Users, permission: "users.view", description: "All employees with role, department, and status." },
  { href: "/workspace/reports/tasks", label: "Tasks Report", icon: ListTodo, permission: "leads.tasks.manage", description: "Every task across every lead, with completion status." },
  { href: "/workspace/reports/documents", label: "Documents Report", icon: FileText, permission: null, description: "Lead and employee documents in one combined view." },
  { href: "/workspace/reports/activity-logs", label: "Activity Log Report", icon: ScrollText, permission: "activity_logs.view", description: "Full audit trail for this workspace." },
];

const ANALYTICS = [
  { href: "/workspace/dashboard", label: "CRM & Workspace Analytics", icon: LayoutDashboard, description: "Pipeline, conversion, team performance, and org charts — already live on the dashboard." },
];

export default async function ReportsHubPage() {
  const session = await getSession();
  const visible = [];
  for (const r of REPORTS) {
    if (!r.permission || (await canAny(session, [r.permission, "employee_documents.manage", "leads.documents.manage"]))) visible.push(r);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Reports</h1>
      <p className="text-neutral-500 text-sm mb-6">Export-ready reports and links to live analytics.</p>

      <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wide mb-3">Data Reports</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {visible.map(({ href, label, icon: Icon, description }) => (
          <Link key={href} href={href} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 transition">
            <Icon className="h-6 w-6 text-indigo-400 mb-3" />
            <p className="text-white font-medium mb-1">{label}</p>
            <p className="text-neutral-500 text-xs">{description}</p>
          </Link>
        ))}
      </div>

      <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wide mb-3">Analytics</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ANALYTICS.map(({ href, label, icon: Icon, description }) => (
          <Link key={href} href={href} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 transition">
            <Icon className="h-6 w-6 text-emerald-400 mb-3" />
            <p className="text-white font-medium mb-1">{label}</p>
            <p className="text-neutral-500 text-xs">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
