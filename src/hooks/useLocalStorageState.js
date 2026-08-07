"use client";
import { useState, useEffect, useCallback } from "react";

/**
 * localStorage-backed state that's SSR-safe: starts at `initial` on the
 * server and first client render (avoiding a hydration mismatch), then
 * syncs from localStorage in an effect right after mount.
 */
export function useLocalStorageState(key, initial) {
  const [value, setValue] = useState(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored));
    } catch { /* ignore malformed storage */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback((next) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      try { window.localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* storage unavailable */ }
      return resolved;
    });
  }, [key]);

  return [value, set, hydrated];
}
