"use client";
import { createContext, useContext } from "react";

const TimezoneContext = createContext("UTC");
const Hour12Context = createContext(true);

/** Seeded server-side from the company's `system.timezone`/`system.time_format`
 * setting (workspace/layout.js, platform/layout.js) — no client fetch, no flash. */
export function TimezoneProvider({ timezone, hour12 = true, children }) {
  return (
    <TimezoneContext.Provider value={timezone || "UTC"}>
      <Hour12Context.Provider value={hour12}>{children}</Hour12Context.Provider>
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}

/** true = 12-hour clock (default), false = 24-hour — from the company's `system.time_format` setting. */
export function useHour12() {
  return useContext(Hour12Context);
}
