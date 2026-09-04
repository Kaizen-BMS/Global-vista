"use client";
import { Minus, Plus, Users } from "lucide-react";
import { DEFAULT_SEATS, SEAT_STEP } from "@/lib/helpers/seats";

/**
 * The seat-count picker for a per_user plan — shown wherever such a plan
 * is being chosen (never on the invoice itself, which just displays
 * whatever was picked here). Floors at DEFAULT_SEATS (5) and only ever
 * moves in steps of SEAT_STEP (5), matching the company's own rule: the
 * account owner counts as the first seat in that starting block.
 */
export default function SeatStepper({ value, onChange, dark = false, disabled = false }) {
  const faint = dark ? "text-white/40" : "text-muted-foreground";
  const strong = dark ? "text-white" : "text-foreground";
  const btnClass = dark
    ? "h-8 w-8 flex items-center justify-center rounded-md border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
    : "h-8 w-8 flex items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition";

  return (
    <div>
      <p className={`flex items-center gap-1.5 text-xs mb-1.5 font-medium ${faint}`}><Users className="h-3 w-3" /> Users</p>
      <div className="flex items-center gap-3">
        <button
          type="button" disabled={disabled || value <= DEFAULT_SEATS}
          onClick={() => onChange(Math.max(DEFAULT_SEATS, value - SEAT_STEP))}
          className={btnClass} aria-label="Remove 5 seats"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className={`text-sm font-semibold w-20 text-center ${strong}`}>{value} {value === 1 ? "seat" : "seats"}</span>
        <button
          type="button" disabled={disabled}
          onClick={() => onChange(value + SEAT_STEP)}
          className={btnClass} aria-label="Add 5 seats"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className={`text-[11px] mt-1.5 ${faint}`}>Seats come in blocks of {SEAT_STEP} — you (the account owner) count as the first seat.</p>
    </div>
  );
}
