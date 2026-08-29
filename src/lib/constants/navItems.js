import { Users, ShieldCheck, Settings, ScrollText, UserCircle, Building2, LayoutDashboard, FileText, Bell, Contact2, BarChart3, CalendarClock, ClipboardList, Package, Activity, CreditCard, MessageSquare, MessageSquareWarning, Lightbulb, Newspaper, Megaphone, Tag } from "lucide-react";
export const ICON_MAP = { Users, ShieldCheck, Settings, ScrollText, UserCircle, Building2, LayoutDashboard, FileText, Bell, Contact2, BarChart3, CalendarClock, ClipboardList, Package, Activity, CreditCard, MessageSquare, MessageSquareWarning, Lightbulb, Newspaper, Megaphone, Tag };

export const PLATFORM_NAV_ITEMS = [
  { href: "/platform", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/platform/companies", label: "Companies", icon: "Building2" },
  { href: "/platform/subscriptions", label: "Subscriptions", icon: "CreditCard" },
  { href: "/platform/coupons", label: "Coupons", icon: "Tag" },
  { href: "/platform/modules", label: "Modules", icon: "Package" },
  { href: "/platform/blog", label: "Blog", icon: "Newspaper" },
  { href: "/platform/offers", label: "Offers", icon: "Megaphone" },
  { href: "/platform/activity-logs", label: "Activity Logs", icon: "ScrollText" },
  { href: "/platform/system-health", label: "System Health", icon: "Activity" },
  { href: "/platform/support", label: "Support Tickets", icon: "MessageSquareWarning" },
  { href: "/platform/settings", label: "Settings", icon: "Settings" },
];
export const ALL_NAV_ITEMS = [
  { href: "/workspace/dashboard", label: "Dashboard", icon: "LayoutDashboard", permission: "dashboard.view" },
  { href: "/workspace/lead-management", label: "Leads", icon: "Contact2", permission: "leads.view" },
  { href: "/workspace/lead-forms", label: "Query Forms", icon: "ClipboardList", permission: "leads.view" },
  { href: "/workspace/followups", label: "Follow-ups", icon: "CalendarClock", permission: "leads.view" },
  { href: "/workspace/reports", label: "Reports", icon: "BarChart3", permission: null, module: "reports" },
  { href: "/workspace/users", label: "Employees", icon: "Users", permission: "users.view" },
  { href: "/workspace/roles", label: "Roles", icon: "ShieldCheck", permission: "roles.manage" },
  // "Organization" intentionally has no separate sidebar entry — it already
  // lives at Settings > Organization (see SettingsTabs.js) and stays fully
  // reachable there; this just removes the duplicate top-level link.
  { href: "/workspace/settings", label: "Settings", icon: "Settings", permission: "settings.manage" },
  { href: "/workspace/documents", label: "Documents", icon: "FileText", permission: "employee_documents.manage" },
  { href: "/workspace/messages", label: "Messages", icon: "MessageSquare", permission: null },
  // Complaints and Ideas moved from separate top-level items into one
  // "Support & Feedback" entry, visually presented as part of Settings
  // (shows the same tab bar) but deliberately kept OFF the /workspace/settings/*
  // URL prefix and permission:null (not settings.manage) — every employee
  // needs this regardless of whether they can manage settings, and nesting
  // it under /workspace/settings/ would also make Sidebar.js's ancestor-vs-
  // sibling active-state logic stop highlighting "Settings" on every other
  // settings page (see isActive in Sidebar.js).
  { href: "/workspace/support", label: "Support & Feedback", icon: "MessageSquareWarning", permission: null },
  { href: "/workspace/notifications", label: "Notifications", icon: "Bell", permission: null },
  { href: "/workspace/activity-logs", label: "Activity Logs", icon: "ScrollText", permission: "activity_logs.view" },
  { href: "/workspace/profile", label: "Profile", icon: "UserCircle", permission: null },
];