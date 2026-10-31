"use client";
import Link from "next/link";
import { UserPlus, ShieldCheck, Settings, Contact2 } from "lucide-react";
export default function QuickActionsCard({ isChildCompany = false }) {
  const ACTIONS = [{ href: "/workspace/lead-management/new", label: isChildCompany ? "Add Student" : "Add Lead", icon: Contact2 }, { href: "/workspace/users", label: "Add User", icon: UserPlus }, { href: "/workspace/roles", label: "Manage Roles", icon: ShieldCheck }, { href: "/workspace/settings/organization", label: "Settings", icon: Settings }];
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-foreground font-medium mb-4">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">{ACTIONS.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg bg-muted/60 hover:bg-muted border border-border text-foreground hover:text-foreground transition text-xs"><Icon className="h-4 w-4" />{label}</Link>)}</div>
    </div>
  );
}
