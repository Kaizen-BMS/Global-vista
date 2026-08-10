"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@/lib/constants/zIndex";

/**
 * Why this exists: a dropdown positioned with `absolute` inside the
 * topbar only ever wins z-index comparisons against its OWN stacking
 * context's siblings. The moment any dashboard card, chart, or Framer
 * Motion wrapper elsewhere on the page establishes its own stacking
 * context (transform/opacity/filter — Framer Motion sets these even for
 * simple fades), the dropdown's z-index stops being compared against it
 * at all; DOM order wins instead, and content painted later in the tree
 * covers it regardless of how high the z-index goes. The same trap
 * catches plain `position: fixed` too — a `transform`-having ancestor
 * becomes ITS containing block instead of the viewport. Portaling
 * straight to `document.body` sidesteps the whole problem: the panel
 * becomes a top-level sibling of the entire app, in the ONE stacking
 * context every other overlay also competes in, so a single shared
 * z-index scale (zIndex.js) actually means something.
 *
 * Positioned relative to either an `anchorRef` element (dropdowns) or a
 * raw `point` {x,y} (right-click context menus), clamped to stay inside
 * the viewport on every side — flipping left when it would overflow
 * right, capping height with internal scroll when it would overflow
 * bottom.
 */
export default function FloatingPanel({
  anchorRef, point, open, onClose, children, align = "end", width = 320, zIndex = Z_INDEX.overlayMenu, className = "",
}) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!open || (!anchorRef?.current && !point)) { setPos(null); return; }
    function updatePosition() {
      const rect = point ? { left: point.x, right: point.x, top: point.y, bottom: point.y } : anchorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const effectiveWidth = Math.min(width, vw - 16);
      let left = align === "end" ? rect.right - effectiveWidth : rect.left;
      left = Math.min(Math.max(8, left), vw - effectiveWidth - 8);
      const top = Math.min(rect.bottom + 8, vh - 40);
      const maxHeight = vh - top - 12;
      setPos({ top, left, width: effectiveWidth, maxHeight });
    }
    updatePosition();
    if (!point) {
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); };
    }
  }, [open, anchorRef, point, align, width]);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e) {
      if (panelRef.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    }
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocPointer); document.removeEventListener("keydown", onKey); };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, zIndex }}
      className={`overflow-y-auto bg-popover border border-border rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}
