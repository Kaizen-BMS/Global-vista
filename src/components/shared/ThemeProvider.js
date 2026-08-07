"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "gv:theme";

function getSystemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.setAttribute("data-theme", resolved);
}

/**
 * theme: what the user picked ("dark" | "light" | "system").
 * resolvedTheme: the actual applied theme ("dark" | "light"), with
 * "system" resolved against prefers-color-scheme. Toggles Tailwind's
 * existing `.dark` class on <html> — reusing the CSS-variable theme
 * system already defined in globals.css (@custom-variant dark) rather
 * than inventing a parallel one.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");
  const [resolvedTheme, setResolvedTheme] = useState("dark");

  useEffect(() => {
    let stored = "dark";
    try { stored = window.localStorage.getItem(STORAGE_KEY) || "dark"; } catch { /* ignore */ }
    setThemeState(stored);
    const resolved = stored === "system" ? getSystemTheme() : stored;
    setResolvedTheme(resolved);
    applyTheme(resolved);

    if (stored === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => { const r = getSystemTheme(); setResolvedTheme(r); applyTheme(r); };
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    const resolved = next === "system" ? getSystemTheme() : next;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: "dark", resolvedTheme: "dark", setTheme: () => {} };
  return ctx;
}
