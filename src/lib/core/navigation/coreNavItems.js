// Client-safe. No server-only imports here — this file is bundled into
// both server (menu.js) and client (Sidebar.js) code, so it must never
// import db.js, auth.js, permissions.js, or mysql2.
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Contact2,
  Settings,
  ScrollText,
  UserCircle,
} from "lucide-react";

export const ICON_MAP = {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Contact2,
  Settings,
  ScrollText,
  UserCircle,
};

/**
 * Single source of truth for sidebar items. Each item declares the
 * permission slug required to see it — Super Admin always sees all.
 * `icon` is a string key into ICON_MAP so this array stays plain/
 * serializable data (safe to pass from server to client as props).
 */
export const ALL_NAV_ITEMS = [
  { href: "/crm/dashboard", label: "Dashboard", icon: "LayoutDashboard", permission: "dashboard.view" },
  { href: "/crm/lead-management", label: "Leads", icon: "Contact2", permission: "leads.view" },
  { href: "/crm/users", label: "Users", icon: "Users", permission: "users.view" },
  { href: "/crm/roles", label: "Roles", icon: "ShieldCheck", permission: "roles.manage" },
  { href: "/crm/settings/branding", label: "Settings", icon: "Settings", permission: "settings.manage" },
  { href: "/crm/activity-logs", label: "Activity Logs", icon: "ScrollText", permission: "activity_logs.view" },
  { href: "/crm/profile", label: "Profile", icon: "UserCircle", permission: null },
];