"use client";
import { useEffect, useState } from "react";
import { useTimezone, useHour12 } from "@/components/shared/TimezoneProvider";
import { zoneAbbreviation } from "@/lib/helpers/dateFormat";

// Client-only clock, ticking every second, driven by the same company
// timezone every other date/time in the workspace uses (TimezoneProvider,
// seeded server-side — see that file). `now` starts null so the server
// render and the first client render both produce nothing here, avoiding a
// hydration mismatch; the real time only appears after mount.
export default function LiveClock({ className = "" }) {
  const timezone = useTimezone();
  const hour12 = useHour12();
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className={`hidden lg:flex flex-col items-end leading-tight ${className}`} aria-hidden />;

  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12 }).format(now);
  const zoneLabel = zoneAbbreviation(timezone, now);

  return (
    <div className={`hidden lg:flex flex-col items-end leading-tight ${className}`}>
      <span className="text-foreground text-sm font-medium tabular-nums">{timeLabel} <span className="text-muted-foreground text-xs">{zoneLabel}</span></span>
      <span className="text-muted-foreground text-[11px]">{dateLabel}</span>
    </div>
  );
}
