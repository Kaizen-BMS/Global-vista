import "server-only";
import { registerModule } from "@/lib/platform/moduleRegistry";

registerModule({
  slug: "crm",
  navItems: [
    { href: "/workspace/lead-management", label: "Leads", icon: "Contact2", permission: "leads.view" },
    { href: "/workspace/students", label: "Students", icon: "GraduationCap", permission: null },
    { href: "/workspace/tasks", label: "Tasks", icon: "CheckSquare", permission: null },
    { href: "/workspace/calendar", label: "Calendar", icon: "Calendar", permission: null },
    { href: "/workspace/reports", label: "Reports", icon: "BarChart3", permission: null },
  ],
});
export {};