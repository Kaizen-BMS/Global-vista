"use client";

import { Users, ShieldCheck, Lock } from "lucide-react";

const iconMap = {
  users: Users,
  shield: ShieldCheck,
  lock: Lock,
};

export default function StatCard({
  label,
  value,
  icon,
  accent = "indigo",
}) {
  const Icon = iconMap[icon];

  const accents = {
    indigo: "text-indigo-400 bg-indigo-500/10",
    green: "text-green-400 bg-green-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
      <div>
        <p className="text-neutral-500 text-xs mb-1">
          {label}
        </p>

        <p className="text-white text-2xl font-semibold">
          {value}
        </p>
      </div>

      {Icon && (
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center ${accents[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}