"use client";
import { useState } from "react";
const TABS = ["Overview", "Login History", "Activity"];
export default function EmployeeProfileTabs({ user, loginHistory, activity }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-neutral-800">{TABS.map((t, i) => <button key={t} onClick={() => setActive(i)} className={`px-3 py-2 text-sm border-b-2 ${active === i ? "border-indigo-500 text-white" : "border-transparent text-neutral-500"}`}>{t}</button>)}</div>
      {active === 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3"><p className="text-neutral-500 text-xs">Phone</p><p className="text-white text-sm">{user.phone || "—"}</p></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3"><p className="text-neutral-500 text-xs">Role</p><p className="text-white text-sm">{user.role_name}</p></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3"><p className="text-neutral-500 text-xs">Status</p><p className="text-white text-sm">{user.status}</p></div>
      </div>}
      {active === 1 && <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">{loginHistory.map((e) => <div key={e.id} className="px-4 py-3 flex justify-between"><span className="text-white text-sm capitalize">{e.event.replace("_", " ")}</span><span className="text-neutral-500 text-xs">{new Date(e.created_at).toLocaleString()}</span></div>)}</div>}
      {active === 2 && <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">{activity.map((l) => <div key={l.id} className="px-4 py-3"><p className="text-white text-sm">{l.description}</p><p className="text-neutral-500 text-xs">{new Date(l.created_at).toLocaleString()}</p></div>)}</div>}
    </div>
  );
}