"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Monitor, Loader2, LogOut } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

export default function SessionsPanel() {
  const [sessions, setSessions] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/auth/sessions"); // GET — no CSRF needed
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function terminate(sessionId) {
    setBusyId(sessionId);
    try {
      const res = await apiFetch("/api/auth/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "terminate", sessionId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Session terminated.");
      load();
    } catch {
      toast.error("Failed to terminate session.");
    } finally {
      setBusyId(null);
    }
  }

  async function logoutAll() {
    setLoggingOutAll(true);
    try {
      const res = await apiFetch("/api/auth/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout_all" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Logged out of all other devices.");
      load();
    } catch {
      toast.error("Failed to log out other devices.");
    } finally {
      setLoggingOutAll(false);
    }
  }

  if (sessions === null) {
    return <div className="text-neutral-500 text-sm">Loading sessions…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-medium">Active Sessions</p>
        <button
          onClick={logoutAll}
          disabled={loggingOutAll}
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 disabled:opacity-60"
        >
          {loggingOutAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <LogOut className="h-3.5 w-3.5" />
          Logout all other devices
        </button>
      </div>

      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Monitor className="h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-white text-sm">
                  {s.is_current ? "This device" : (s.user_agent || "Unknown device")}
                  {s.is_current && <span className="ml-2 text-[10px] text-green-400">CURRENT</span>}
                </p>
                <p className="text-neutral-500 text-xs">
                  {s.ip_address || "Unknown IP"} · Last active {new Date(s.last_seen_at).toLocaleString()}
                </p>
              </div>
            </div>
            {!s.is_current && (
              <button
                onClick={() => terminate(s.id)}
                disabled={busyId === s.id}
                className="text-xs text-neutral-400 hover:text-red-400"
              >
                Terminate
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}