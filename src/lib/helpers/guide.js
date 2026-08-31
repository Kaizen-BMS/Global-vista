import "server-only";
import { can } from "@/lib/helpers/permissions";
import { isModuleEnabledForCompany } from "@/lib/platform/tenant";

/**
 * The in-app "Visual Guide" floating widget's content — one short,
 * plain-language entry per BASIC feature area, deliberately mirroring
 * ALL_NAV_ITEMS' own permission/module gating (see menu.js's
 * getVisibleNavItems) rather than inventing a second, possibly-drifting
 * set of rules: a feature this list mentions is a feature the same user
 * can already see in their own sidebar right now. A couple of entries
 * below (Payments, Call Recording) live inside a Lead's page rather than
 * as their own sidebar link, so they're listed here with their own
 * permission/module check the same way.
 */
export const GUIDE_ENTRIES = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", permission: "dashboard.view", description: "Your daily snapshot — leads, follow-ups, and team activity at a glance." },
  { key: "leads", label: "Leads", icon: "Contact2", permission: "leads.view", description: "Capture, track, and move every lead through your pipeline from first contact to close." },
  { key: "lead-forms", label: "Query Forms", icon: "ClipboardList", permission: "leads.view", description: "Public forms you can share — every submission becomes a lead automatically." },
  { key: "followups", label: "Follow-ups", icon: "CalendarClock", permission: "leads.view", description: "Every upcoming and overdue call-back or meeting, in one place, so nothing slips through." },
  { key: "calls", label: "Call & Record", icon: "Phone", permission: "leads.calls.view", description: "From inside a lead, place a recorded call so you can verify it actually happened." },
  { key: "payments", label: "Payments", icon: "Wallet", module: "payments", description: "Record payments collected against a lead and track what's still pending, right from their page." },
  { key: "reports", label: "Reports", icon: "BarChart3", module: "reports", description: "Pipeline, revenue, and team performance — filterable by date range." },
  { key: "users", label: "Employees", icon: "Users", permission: "users.view", description: "Add your team, assign their role, branch, and department." },
  { key: "roles", label: "Roles", icon: "ShieldCheck", permission: "roles.manage", description: "Control exactly what each role in your company is allowed to see and do." },
  { key: "settings", label: "Settings", icon: "Settings", permission: "settings.manage", description: "Branding, org structure, lead setup, payment and calling integrations — all in one place." },
  { key: "documents", label: "Documents", icon: "FileText", permission: "employee_documents.manage", description: "Track required employee documents, with reminders for what's missing or expiring." },
  { key: "messages", label: "Messages", icon: "MessageSquare", description: "Direct and group chat with your team, plus company-wide announcements." },
  { key: "support", label: "Support & Feedback", icon: "MessageSquareWarning", description: "Raise a complaint, share an idea, or escalate a problem straight to the KaizenBMS team." },
  { key: "activity-logs", label: "Activity Logs", icon: "ScrollText", permission: "activity_logs.view", description: "A full audit trail of who did what, and when." },
];

export async function getVisibleGuideEntries(session) {
  const visible = [];
  for (const entry of GUIDE_ENTRIES) {
    if (entry.permission && !(await can(session, entry.permission))) continue;
    if (entry.module && !(await isModuleEnabledForCompany(session.company_id, entry.module))) continue;
    visible.push(entry);
  }
  return visible;
}
