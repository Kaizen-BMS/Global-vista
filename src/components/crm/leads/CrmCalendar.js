"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Phone, MessageCircle, Users as UsersIcon, Video, Mail, Bell, CheckSquare, X } from "lucide-react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const KIND_ICONS = {
  "Phone Call": Phone, WhatsApp: MessageCircle, Meeting: UsersIcon, Zoom: Video, Email: Mail, Reminder: Bell,
};

function dateKey(d) { return d.toISOString().slice(0, 10); }

export default function CrmCalendar({ year, month, events }) {
  const router = useRouter();
  const todayKey = dateKey(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const key = new Date(e.at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const startOffset = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const arr = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(Date.UTC(year, month - 1, d)));
    return arr;
  }, [year, month]);

  function navigate(delta) {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    router.push(`/workspace/lead-management/calendar?year=${y}&month=${m}`);
  }

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) || []) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <p className="text-white font-medium">{MONTH_NAMES[month - 1]} {year}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => router.push("/workspace/lead-management/calendar")} className="px-2.5 py-1 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition">Today</button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-neutral-800">
          {WEEKDAYS.map((w) => <div key={w} className="px-2 py-2 text-center text-[11px] font-medium text-neutral-600">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="h-24 border-b border-r border-neutral-800/60 bg-neutral-950/30" />;
            const key = dateKey(d);
            const dayEvents = eventsByDay.get(key) || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const overdue = dayEvents.some((e) => e.status === "Scheduled" && new Date(e.at) < new Date());
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`h-24 border-b border-r border-neutral-800/60 p-1.5 text-left align-top transition cursor-pointer hover:bg-neutral-800/40 ${isSelected ? "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/40" : ""}`}
              >
                <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-xs ${isToday ? "bg-indigo-600 text-white" : "text-neutral-400"}`}>{d.getUTCDate()}</span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <p key={e.id} className={`truncate text-[10px] px-1 py-0.5 rounded ${e.kind === "task" ? "bg-purple-500/10 text-purple-300" : "bg-indigo-500/10 text-indigo-300"}`}>{e.leadName}</p>
                  ))}
                  {dayEvents.length > 2 && <p className="text-[10px] text-neutral-600">+{dayEvents.length - 2} more</p>}
                  {overdue && <span className="block h-1.5 w-1.5 rounded-full bg-red-500" title="Overdue" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        {!selectedDay ? (
          <p className="text-neutral-500 text-sm text-center py-10">Click a day to see its follow-ups and tasks.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-medium text-sm">{new Date(selectedDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
              <button onClick={() => setSelectedDay(null)} className="text-neutral-500 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              {selectedEvents.length === 0 && <p className="text-neutral-600 text-sm">Nothing scheduled.</p>}
              {selectedEvents.map((e) => {
                const Icon = e.kind === "task" ? CheckSquare : (KIND_ICONS[e.label] || Bell);
                return (
                  <Link key={e.id} href={`/workspace/lead-management/${e.leadId}`} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition cursor-pointer">
                    <Icon className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm text-white truncate">{e.leadName} — {e.label}</span>
                      <span className="block text-xs text-neutral-500">{new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {e.status}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
