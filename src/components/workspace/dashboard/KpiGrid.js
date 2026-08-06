import {
  Contact2, CalendarClock, TrendingUp, Sparkles, Users, Building2, Network,
  BadgeCheck, ShieldCheck, KeyRound, FileText, ListTodo, PartyPopper, Bell, LogIn, Lock,
} from "lucide-react";

const ICONS = {
  contact: Contact2, calendar: CalendarClock, trending: TrendingUp, sparkles: Sparkles,
  users: Users, building: Building2, network: Network, badge: BadgeCheck, shield: ShieldCheck,
  key: KeyRound, file: FileText, list: ListTodo, party: PartyPopper, bell: Bell, login: LogIn, lock: Lock,
};

const ACCENTS = {
  indigo: "text-indigo-400 bg-indigo-500/10", green: "text-emerald-400 bg-emerald-500/10",
  yellow: "text-amber-400 bg-amber-500/10", red: "text-red-400 bg-red-500/10",
  blue: "text-sky-400 bg-sky-500/10", purple: "text-violet-400 bg-violet-500/10",
  neutral: "text-neutral-400 bg-neutral-500/10",
};

function Kpi({ label, value, icon, accent = "indigo", hint }) {
  const Icon = ICONS[icon];
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between hover:border-neutral-700 transition-colors">
      <div className="min-w-0">
        <p className="text-neutral-500 text-xs mb-1 truncate">{label}</p>
        <p className="text-white text-xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-neutral-600 text-[11px] mt-0.5">{hint}</p>}
      </div>
      {Icon && <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${ACCENTS[accent]}`}><Icon className="h-4.5 w-4.5" /></div>}
    </div>
  );
}

export function CrmKpiGrid({ crm }) {
  const cards = [
    { label: "Total Leads", value: crm.totalLeads, icon: "contact", accent: "indigo" },
    { label: "New Leads", value: crm.newLeads, icon: "sparkles", accent: "blue" },
    { label: "Today's Follow-ups", value: crm.todaysFollowups, icon: "calendar", accent: "yellow" },
    { label: "Conversion Rate", value: `${crm.conversionRate}%`, icon: "trending", accent: "green" },
  ];
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{cards.map((c) => <Kpi key={c.label} {...c} />)}</div>;
}

export function OrgKpiGrid({ activeUsers, roles, lockedAccounts, org, anniversaryCount, unreadNotifications, recentLoginCount }) {
  const cards = [
    { label: "Employees", value: activeUsers, icon: "users", accent: "blue" },
    { label: "Departments", value: org.departments, icon: "building", accent: "indigo" },
    { label: "Branches", value: org.branches, icon: "network", accent: "purple" },
    { label: "Designations", value: org.designations, icon: "badge", accent: "indigo" },
    { label: "Roles", value: roles, icon: "shield", accent: "green" },
    { label: "Permissions", value: org.permissions, icon: "key", accent: "neutral" },
    { label: "Documents", value: org.documents, icon: "file", accent: "yellow" },
    { label: "Pending Tasks", value: org.pendingTasks, icon: "list", accent: org.pendingTasks > 0 ? "yellow" : "neutral" },
    { label: "Upcoming Anniversaries", value: anniversaryCount, icon: "party", accent: "purple", hint: "next 30 days" },
    { label: "Notifications", value: unreadNotifications, icon: "bell", accent: unreadNotifications > 0 ? "red" : "neutral", hint: "unread" },
    { label: "Recent Logins", value: recentLoginCount, icon: "login", accent: "blue", hint: "last 7 days" },
    { label: "Locked Accounts", value: lockedAccounts, icon: "lock", accent: lockedAccounts > 0 ? "red" : "neutral" },
  ];
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{cards.map((c) => <Kpi key={c.label} {...c} />)}</div>;
}
