"use client";
import { createContext, useContext, useState } from "react";

const MobileNavContext = createContext(null);

export function MobileNavProvider({ children }) {
  const [open, setOpen] = useState(false);
  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) return { open: false, setOpen: () => {} }; // safe no-op outside the provider (e.g. print preview)
  return ctx;
}
