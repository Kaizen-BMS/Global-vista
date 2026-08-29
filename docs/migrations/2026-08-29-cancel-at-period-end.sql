-- ============================================================================
-- Migration: Cancel at period end
--
-- Cancelling a subscription previously cut access immediately
-- (company_subscriptions.status -> 'cancelled' the instant the button was
-- clicked, and tenant.js blocks access the moment status='cancelled') even
-- though the company had already paid through the end of the current
-- billing period. This column lets a company-initiated cancel defer the
-- actual cutoff to `ends_at` (the paid-through date) instead — the standard
-- SaaS behavior. Admin force-cancel (Platform Console) is unaffected and
-- stays immediate, since that's an enforcement action, not a customer
-- request.
-- ============================================================================

ALTER TABLE company_subscriptions
  ADD COLUMN cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0 AFTER cancelled_at;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — new column defaults to 0 (off) for every
-- existing row, so no subscription's current behavior changes until someone
-- cancels again after this runs.
--
-- ROLLBACK SQL:
-- ALTER TABLE company_subscriptions DROP COLUMN cancel_at_period_end;
--
-- VERIFICATION SQL:
-- SHOW COLUMNS FROM company_subscriptions LIKE 'cancel_at_period_end';
-- ============================================================================
