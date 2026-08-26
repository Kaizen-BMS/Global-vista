import Link from "next/link";
import {
  Contact2, CalendarClock, TrendingUp, Sparkles, Users, Building2, Network,
  BadgeCheck, ShieldCheck, KeyRound, FileText, ListTodo, PartyPopper, Bell, LogIn, Lock,
  CreditCard, Receipt, CalendarCheck,
} from "lucide-react";

const ICONS = {
  contact: Contact2, calendar: CalendarClock, trending: TrendingUp, sparkles: Sparkles,
  users: Users, building: Building2, network: Network, badge: BadgeCheck, shield: ShieldCheck,
  key: KeyRound, file: FileText, list: ListTodo, party: PartyPopper, bell: Bell, login: LogIn, lock: Lock,
  card: CreditCard, receipt: Receipt, calendarCheck: CalendarCheck,
};

const ACCENTS = {
  indigo: "text-indigo-400 bg-indigo-500/10", green: "text-emerald-400 bg-emerald-500/10",
  yellow: "text-amber-400 bg-amber-500/10", red: "text-red-400 bg-red-500/10",
  blue: "text-sky-400 bg-sky-500/10", purple: "text-violet-400 bg-violet-500/10",
  neutral: "text-muted-foreground bg-muted-foreground/10",
};

function Kpi({ label, value, icon, accent = "indigo", hint, href }) {
  const Icon = ICONS[icon];
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs mb-1 truncate">{label}</p>
        <p className="text-foreground text-xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground text-[11px] mt-0.5">{hint}</p>}
      </div>
      {Icon && <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${ACCENTS[accent]}`}><Icon className="h-4.5 w-4.5" /></div>}
    </>
  );
  const className = "bg-card border border-border rounded-xl p-4 flex items-center justify-between transition-all";
  return href ? (
    <Link href={href} className={`${className} cursor-pointer hover:border-border hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}>{content}</Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function CrmKpiGrid({ crm }) {
  const cards = [
    { label: "Total Leads", value: crm.totalLeads, icon: "contact", accent: "indigo", href: "/workspace/lead-management" },
    { label: "Assigned to Me", value: crm.myLeads, icon: "users", accent: "blue", href: "/workspace/lead-management?assignedTo=me" },
    { label: "Unassigned", value: crm.unassignedLeads, icon: "sparkles", accent: crm.unassignedLeads > 0 ? "yellow" : "neutral", href: "/workspace/lead-management?assignedTo=unassigned" },
    { label: "Today's Follow-ups", value: crm.todaysFollowups, icon: "calendar", accent: "yellow", href: "/workspace/followups" },
    { label: "Conversion Rate", value: `${crm.conversionRate}%`, icon: "trending", accent: "green", href: "/workspace/lead-management" },
  ];
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{cards.map((c) => <Kpi key={c.label} {...c} />)}</div>;
}

/** Platform subscription billing — what THIS company has actually paid the
 * platform, distinct from the "Payments" section above (which is money
 * this company collects FROM its own leads/customers). Only rendered when
 * at least one real payment exists — a brand-new/trial/manual company sees
 * nothing here rather than a wall of zeros. */
export function SubscriptionKpiGrid({ planName, totalPaid, currency, lastPaymentAmount, lastPaymentDate, gateway }) {
  const cards = [
    { label: "Current Plan", value: planName || "—", icon: "calendarCheck", accent: "indigo", href: "/workspace/settings/subscription" },
    { label: "Total Paid", value: `${currency} ${Number(totalPaid).toLocaleString()}`, icon: "card", accent: "green", href: "/workspace/settings/subscription" },
    { label: "Last Payment", value: lastPaymentAmount != null ? `${currency} ${Number(lastPaymentAmount).toLocaleString()}` : "—", icon: "receipt", accent: "blue", hint: lastPaymentDate ? `${lastPaymentDate}${gateway ? ` · ${gateway}` : ""}` : null, href: "/workspace/settings/subscription" },
  ];
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{cards.map((c) => <Kpi key={c.label} {...c} />)}</div>;
}

export function OrgKpiGrid({ activeUsers, roles, lockedAccounts, org, anniversaryCount, unreadNotifications, recentLoginCount }) {
  const cards = [
    { label: "Employees", value: activeUsers, icon: "users", accent: "blue", href: "/workspace/users" },
    { label: "Departments", value: org.departments, icon: "building", accent: "indigo", href: "/workspace/settings/organization" },
    { label: "Branches", value: org.branches, icon: "network", accent: "purple", href: "/workspace/settings/organization" },
    { label: "Designations", value: org.designations, icon: "badge", accent: "indigo", href: "/workspace/settings/organization" },
    { label: "Roles", value: roles, icon: "shield", accent: "green", href: "/workspace/roles" },
    { label: "Permissions", value: org.permissions, icon: "key", accent: "neutral", href: "/workspace/roles" },
    { label: "Documents", value: org.documents, icon: "file", accent: "yellow", href: "/workspace/documents" },
    { label: "Pending Tasks", value: org.pendingTasks, icon: "list", accent: org.pendingTasks > 0 ? "yellow" : "neutral", href: "/workspace/reports/tasks" },
    { label: "Upcoming Anniversaries", value: anniversaryCount, icon: "party", accent: "purple", hint: "next 30 days", href: "/workspace/users" },
    { label: "Notifications", value: unreadNotifications, icon: "bell", accent: unreadNotifications > 0 ? "red" : "neutral", hint: "unread", href: "/workspace/notifications" },
    { label: "Recent Logins", value: recentLoginCount, icon: "login", accent: "blue", hint: "last 7 days", href: "/workspace/activity-logs" },
    { label: "Locked Accounts", value: lockedAccounts, icon: "lock", accent: lockedAccounts > 0 ? "red" : "neutral", href: "/workspace/users" },
  ];
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{cards.map((c) => <Kpi key={c.label} {...c} />)}</div>;
}
