"use client";
import Link from "next/link";
import { UserPlus, ShieldCheck, Settings, Contact2 } from "lucide-react";
const ACTIONS = [{ href: "/workspace/lead-management/new", label: "Add Lead", icon: Contact2 }, { href: "/workspace/users", label: "Add User", icon: UserPlus }, { href: "/workspace/roles", label: "Manage Roles", icon: ShieldCheck }, { href: "/workspace/settings/organization", label: "Settings", icon: Settings }];
export default function QuickActionsCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-foreground font-medium mb-4">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">{ACTIONS.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg bg-muted/60 hover:bg-muted border border-border text-foreground hover:text-foreground transition text-xs"><Icon className="h-4 w-4" />{label}</Link>)}</div>
    </div>
  );
}