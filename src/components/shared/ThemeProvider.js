"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { MotionConfig } from "framer-motion";

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
 * theme / resolvedTheme: always "dark" | "light" — the user explicitly
 * picks one, no "system" option (removed by design: the appearance setting
 * is meant to be a deliberate choice, not something that silently changes
 * under the user). Toggles Tailwind's existing `.dark` class on <html> —
 * reusing the CSS-variable theme system already defined in globals.css
 * (@custom-variant dark) rather than inventing a parallel one.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    let stored = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    // A pre-existing "system" value from before this option was removed is
    // resolved once against the OS preference and persisted as a concrete
    // choice — never silently re-evaluated on every load from then on.
    const resolved = stored === "light" || stored === "dark" ? stored : getSystemTheme();
    setThemeState(resolved);
    applyTheme(resolved);
    if (stored !== resolved) { try { window.localStorage.setItem(STORAGE_KEY, resolved); } catch { /* ignore */ } }
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    applyTheme(next);
  }, []);

  // MotionConfig here (rather than at every animation call site) makes every
  // framer-motion animation in the app respect the OS/browser
  // prefers-reduced-motion setting automatically — the CSS-only
  // prefers-reduced-motion rule in globals.css only catches CSS
  // transitions/animations, not framer-motion's JS-driven ones.
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: "dark", resolvedTheme: "dark", setTheme: () => {} };
  return ctx;
}
