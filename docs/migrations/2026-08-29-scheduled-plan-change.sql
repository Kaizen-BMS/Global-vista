-- ============================================================================
-- Migration: Scheduled plan changes
--
-- Lets a company choose, when switching plans on an active Razorpay
-- subscription, between switching immediately or waiting until the current
-- billing period ends (Razorpay's own schedule_change_at API handles both —
-- see updateRazorpaySubscription). `pending_plan_id` is purely for display
-- ("Switching to X on {date}") and reconciliation once Razorpay's webhook
-- confirms the scheduled change actually took effect; it is NOT what
-- performs the switch — Razorpay itself does that.
-- ============================================================================

ALTER TABLE company_subscriptions
  ADD COLUMN pending_plan_id INT(10) UNSIGNED NULL DEFAULT NULL AFTER plan_id,
  ADD CONSTRAINT fk_company_subscriptions_pending_plan FOREIGN KEY (pending_plan_id) REFERENCES plans(id);

-- ============================================================================
-- EXISTING DATA AFFECTED: none — new column defaults to NULL for every
-- existing row.
--
-- ROLLBACK SQL:
-- ALTER TABLE company_subscriptions DROP FOREIGN KEY fk_company_subscriptions_pending_plan;
-- ALTER TABLE company_subscriptions DROP COLUMN pending_plan_id;
--
-- VERIFICATION SQL:
-- SHOW COLUMNS FROM company_subscriptions LIKE 'pending_plan_id';
-- ============================================================================
