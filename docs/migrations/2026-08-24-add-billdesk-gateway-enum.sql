-- ============================================================================
-- Migration: Add 'billdesk' to the gateway ENUMs
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- IMPORTANT — this closes a real latent bug: BillDesk billing code
-- (billdeskBilling.js) has been writing gateway='billdesk' since it was
-- built, but the live gateway ENUM columns were verified on 2026-08-24 to
-- still only allow ('razorpay','paypal') / ('manual','razorpay','paypal') —
-- 'billdesk' was never added. It hasn't caused a visible error yet only
-- because billdeskClient.js's real HTTP calls still throw
-- BillDeskNotImplementedError before any INSERT/UPDATE with gateway=
-- 'billdesk' is ever reached. Once BillDesk (or Razorpay, restored in this
-- same round) actually completes a real checkout, this MUST already be in
-- place or the write will fail with a truncated-enum error.
--
-- 'paypal' is kept in every ENUM (not dropped) — verified 2 real historical
-- rows in company_subscriptions still reference gateway='paypal'; removing
-- it would break those rows even though the app itself no longer creates
-- new PayPal subscriptions. 'razorpay' was never actually removed from the
-- schema (nor was plans.razorpay_plan_id) — only the code was, and this
-- round restores it.
-- ============================================================================

ALTER TABLE company_subscriptions
  MODIFY COLUMN gateway ENUM('manual','razorpay','paypal','billdesk') NOT NULL DEFAULT 'manual';

ALTER TABLE subscription_payments
  MODIFY COLUMN gateway ENUM('razorpay','paypal','billdesk') NOT NULL;

ALTER TABLE payment_webhook_events
  MODIFY COLUMN gateway ENUM('razorpay','paypal','billdesk') NOT NULL;

-- ============================================================================
-- ROLLBACK (only if you need to undo this migration — safe as long as no
-- row has gateway='billdesk' yet; if any do, back them up first)
-- ============================================================================
-- ALTER TABLE company_subscriptions MODIFY COLUMN gateway ENUM('manual','razorpay','paypal') NOT NULL DEFAULT 'manual';
-- ALTER TABLE subscription_payments MODIFY COLUMN gateway ENUM('razorpay','paypal') NOT NULL;
-- ALTER TABLE payment_webhook_events MODIFY COLUMN gateway ENUM('razorpay','paypal') NOT NULL;
