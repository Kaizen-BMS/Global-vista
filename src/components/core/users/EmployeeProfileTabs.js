"use client";

import { useState } from "react";
import Link from "next/link";
import StageBadge from "@/components/crm/badges/StageBadge";

const TABS = ["Overview", "Assigned Leads", "Login History", "Activity"];

export default function EmployeeProfileTabs({ user, loginHistory, activity, assignedLeads = [] }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-neutral-800 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className={`px-3 py-2 text-sm border-b-2 whitespace-nowrap transition ${
              active === i ? "border-indigo-500 text-white" : "border-transparent text-neutral-500 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoBlock label="Phone" value={user.phone || "—"} />
          <InfoBlock label="Role" value={user.role_name} />
          <InfoBlock label="Status" value={user.status} />
          <InfoBlock label="Last Login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"} />
          <InfoBlock label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
        </div>
      )}

      {active === 1 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
          {assignedLeads.length === 0 && <p className="text-neutral-500 text-sm p-4">No leads currently assigned.</p>}
          {assignedLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/crm/lead-management/${lead.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-800/40"
            >
              <div>
                <p className="text-white text-sm">{lead.name}</p>
                <p className="text-neutral-500 text-xs">{lead.lead_number} · {lead.phone}</p>
              </div>
              <StageBadge stage={lead.stage} />
            </Link>
          ))}
        </div>
      )}

      {active === 2 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
          {loginHistory.length === 0 && <p className="text-neutral-500 text-sm p-4">No login history yet.</p>}
          {loginHistory.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-white text-sm capitalize">{entry.event.replace("_", " ")}</p>
                <p className="text-neutral-500 text-xs">{entry.ip_address || "Unknown IP"}</p>
              </div>
              <span className="text-neutral-500 text-xs">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {active === 3 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
          {activity.length === 0 && <p className="text-neutral-500 text-sm p-4">No activity recorded.</p>}
          {activity.map((log) => (
            <div key={log.id} className="px-4 py-3">
              <p className="text-white text-sm">{log.description || `${log.action} on ${log.module}`}</p>
              <p className="text-neutral-500 text-xs">{new Date(log.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <p className="text-neutral-500 text-xs mb-0.5">{label}</p>
      <p className="text-white text-sm truncate capitalize">{value}</p>
    </div>
  );
}