"use client";
import { useState } from "react";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import EmployeeDocumentsPanel from "@/components/users/EmployeeDocumentsPanel";
const TABS = ["Overview", "Documents", "Login History", "Activity"];
export default function EmployeeProfileTabs({ user, loginHistory, activity, isSelf = false }) {
  const [active, setActive] = useState(0);
  const timezone = useTimezone();
  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-border">{TABS.map((t, i) => <button key={t} onClick={() => setActive(i)} className={`px-3 py-2 text-sm border-b-2 cursor-pointer ${active === i ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>)}</div>
      {active === 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3"><p className="text-muted-foreground text-xs">Phone</p><p className="text-foreground text-sm">{user.phone || "—"}</p></div>
        <div className="bg-card border border-border rounded-lg p-3"><p className="text-muted-foreground text-xs">Role</p><p className="text-foreground text-sm">{user.role_name}</p></div>
        <div className="bg-card border border-border rounded-lg p-3"><p className="text-muted-foreground text-xs">Status</p><p className="text-foreground text-sm">{user.status}</p></div>
      </div>}
      {active === 1 && <EmployeeDocumentsPanel userId={user.id} isSelf={isSelf} />}
      {active === 2 && <div className="bg-card border border-border rounded-xl divide-y divide-border">{loginHistory.map((e) => <div key={e.id} className="px-4 py-3 flex justify-between"><span className="text-foreground text-sm capitalize">{e.event.replace("_", " ")}</span><span className="text-muted-foreground text-xs">{formatDateTime(e.created_at, timezone)}</span></div>)}</div>}
      {active === 3 && <div className="bg-card border border-border rounded-xl divide-y divide-border">{activity.map((l) => <div key={l.id} className="px-4 py-3"><p className="text-foreground text-sm">{l.description}</p><p className="text-muted-foreground text-xs">{formatDateTime(l.created_at, timezone)}</p></div>)}</div>}
    </div>
  );
}
