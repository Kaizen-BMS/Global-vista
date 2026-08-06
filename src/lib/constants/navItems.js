import { Users, ShieldCheck, Settings, ScrollText, UserCircle, Building2, LayoutDashboard, FileText, Bell, Contact2, BarChart3 } from "lucide-react";
export const ICON_MAP = { Users, ShieldCheck, Settings, ScrollText, UserCircle, Building2, LayoutDashboard, FileText, Bell, Contact2, BarChart3 };
export const ALL_NAV_ITEMS = [
  { href: "/workspace/dashboard", label: "Dashboard", icon: "LayoutDashboard", permission: "dashboard.view" },
  { href: "/workspace/lead-management", label: "Leads", icon: "Contact2", permission: "leads.view" },
  { href: "/workspace/reports", label: "Reports", icon: "BarChart3", permission: null },
  { href: "/workspace/users", label: "Users", icon: "Users", permission: "users.view" },
  { href: "/workspace/roles", label: "Roles", icon: "ShieldCheck", permission: "roles.manage" },
  { href: "/workspace/settings/organization", label: "Organization", icon: "Building2", permission: "settings.manage" },
  { href: "/workspace/settings", label: "Settings", icon: "Settings", permission: "settings.manage" },
  { href: "/workspace/documents", label: "Documents", icon: "FileText", permission: "employee_documents.manage" },
  { href: "/workspace/notifications", label: "Notifications", icon: "Bell", permission: null },
  { href: "/workspace/activity-logs", label: "Activity Logs", icon: "ScrollText", permission: "activity_logs.view" },
  { href: "/workspace/profile", label: "Profile", icon: "UserCircle", permission: null },
];