-- Per-user (per_user pricing_model) plans now bill against a purchased
-- SEAT BLOCK the buyer chooses (default 5, adjustable only in multiples of
-- 5 — the account owner counts as the first seat in that block), instead
-- of auto-syncing to whatever the company's real headcount happens to be.
-- `company_subscriptions.seat_quantity` already exists and is reused for
-- this (see 2026-08-XX tiered-plans migration) — no column needed there.
--
-- New here: a company-level GSTIN (for the invoice/tax record — GST is
-- charged on every plan regardless of whether a GSTIN is on file), and a
-- per-payment snapshot of the seat count + GST amount actually billed, so
-- a downloaded invoice for an old payment always reflects what was
-- charged at the time, even if the company's seat count has changed since.

ALTER TABLE companies
  ADD COLUMN gstin VARCHAR(15) NULL AFTER address;

ALTER TABLE subscription_payments
  ADD COLUMN seat_quantity INT NULL AFTER billing_cycle,
  ADD COLUMN gst_amount DECIMAL(12,2) NULL AFTER seat_quantity;
