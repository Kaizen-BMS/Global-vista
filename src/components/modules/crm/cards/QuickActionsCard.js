"use client";

import Link from "next/link";
import { UserPlus, Contact2, ShieldCheck, Settings } from "lucide-react";

const ACTIONS = [
  { href: "/crm/lead-management?new=1", label: "Add Lead", icon: Contact2 },
  { href: "/crm/users?new=1", label: "Add User", icon: UserPlus },
  { href: "/crm/roles", label: "Manage Roles", icon: ShieldCheck },
  { href: "/crm/settings/branding", label: "Settings", icon: Settings },
];

export default function QuickActionsCard() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium mb-4">Quick Actions</p>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition text-xs"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}