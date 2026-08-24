"use client";
import { FocusScope } from "radix-ui/internal";

/**
 * Wraps an existing modal panel — the element that already carries
 * role="dialog" — with Radix's FocusScope primitive, the same primitive
 * Radix's own Dialog uses internally for focus trapping. `asChild` merges
 * FocusScope's behavior directly onto that one child element via Slot
 * instead of inserting a wrapper div, so no modal's markup, styling, or
 * flex/grid layout changes.
 *
 * One primitive covers all three focus requirements: it auto-focuses a
 * focusable descendant on mount, keeps Tab/Shift+Tab cycling inside the
 * scope while `trapped`, and automatically restores focus to whatever
 * element opened the modal when it unmounts — no separate open/close
 * focus-management code needed per modal.
 */
export default function ModalFocusTrap({ children }) {
  return (
    <FocusScope asChild trapped loop>
      {children}
    </FocusScope>
  );
}
