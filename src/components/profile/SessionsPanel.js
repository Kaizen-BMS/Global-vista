"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Monitor, Loader2, LogOut } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function SessionsPanel() {
  const [sessions, setSessions] = useState(null); const [busyId, setBusyId] = useState(null); const [loggingOut, setLoggingOut] = useState(false);
  async function load() { const r = await fetch("/api/core/auth/sessions"); setSessions((await r.json()).sessions || []); }
  useEffect(() => { load(); }, []);
  async function terminate(id) { setBusyId(id); try { await apiFetch("/api/core/auth/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "terminate", sessionId: id }) }); toast.success("Terminated."); load(); } finally { setBusyId(null); } }
  async function logoutAll() { setLoggingOut(true); try { await apiFetch("/api/core/auth/logout-all", { method: "POST" }); toast.success("Logged out everywhere else."); load(); } finally { setLoggingOut(false); } }
  if (!sessions) return <p className="text-neutral-500 text-sm">Loading...</p>;
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><p className="text-white font-medium">Active Sessions</p><button onClick={logoutAll} disabled={loggingOut} className="flex items-center gap-2 text-xs text-red-400">{loggingOut && <Loader2 className="h-3.5 w-3.5 animate-spin" />}<LogOut className="h-3.5 w-3.5" />Logout all other devices</button></div>
      <div className="space-y-2">{sessions.map((s) => <div key={s.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg p-3"><div className="flex items-center gap-3"><Monitor className="h-4 w-4 text-neutral-500" /><div><p className="text-white text-sm">{s.is_current ? "This device" : s.user_agent}{s.is_current && <span className="ml-2 text-[10px] text-green-400">CURRENT</span>}</p></div></div>{!s.is_current && <button onClick={() => terminate(s.id)} disabled={busyId === s.id} className="text-xs text-neutral-400 hover:text-red-400">Terminate</button>}</div>)}</div>
    </div>
  );
}