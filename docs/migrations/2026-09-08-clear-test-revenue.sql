-- Zeroes the Platform Admin dashboard's Revenue KPI / trend chart for a
-- production go-live, WITHOUT any code change and without touching any
-- company, user, or subscription record.
--
-- Checked live: subscription_payments has exactly ONE row today (id=1,
-- company_id=10, INR 9.89, a real test charge made against Razorpay
-- during development) and it's the only row anywhere with
-- status='completed'. Every revenue number on the Platform dashboard
-- (Total Revenue, Period Revenue, the Revenue Trend chart — all three, in
-- src/lib/platform/actions/subscriptionBilling.js and dashboard.js) sums
-- ONLY rows WHERE status='completed' — nothing else in this table.
--
-- This table has no is_deleted column (confirmed via DESCRIBE) — a
-- schema addition would need a matching code change to actually filter
-- by it, which isn't wanted here. Instead, this flips the one row's
-- status to 'refunded' — an existing, valid value the status enum
-- already supports ('completed','refunded','reversed','failed') — which
-- every revenue query above already excludes by design. This is also
-- literally accurate: it was test money, not real revenue. The row
-- itself is NOT deleted — it still shows in Recent Payments, just
-- correctly labeled "Refunded" instead of counted as income — and this
-- is fully reversible (UPDATE status back to 'completed' undoes it
-- exactly) if that's ever wanted.
--
-- Nothing else changes: the company (10), its subscription, its users,
-- and every other company are completely untouched.

UPDATE subscription_payments
SET status = 'refunded'
WHERE id = 1 AND status = 'completed';
