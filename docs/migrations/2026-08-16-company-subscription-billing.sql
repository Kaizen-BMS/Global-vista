-- ============================================================================
-- Migration: Company Subscription Billing — Razorpay + PayPal
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Supersedes the never-applied 2026-08-15-paypal-subscriptions.sql (deleted)
-- — that one was PayPal-only; this version is gateway-agnostic so Razorpay
-- and PayPal share the exact same columns/tables instead of needing a
-- second migration bolted on later.
--
-- Verified against LIVE schema on 2026-08-16 immediately before writing:
--   companies.id / plans.id / company_subscriptions.id = int(10) unsigned
--   company_subscriptions currently has ONLY: id, company_id, plan_id,
--     status, starts_at, ends_at, cancelled_at, created_by, created_at
--     (no updated_at, no gateway linkage at all)
--   plans currently has NO description column and NO gateway columns
--   Neither subscription_payments nor any webhook-event table exists
--   plans has exactly 1 row (Starter); company_subscriptions has 7 rows
--
-- This is a DIFFERENT financial domain from the existing `payments` /
-- `payment_plans` / `payment_installments` tables (those are a COMPANY
-- billing ITS OWN leads/students — lead_id/service_id scoped). This
-- migration never touches those tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PLANS — description + one gateway-linkage column per gateway (a plan
-- can be synced to both Razorpay and PayPal independently).
-- ----------------------------------------------------------------------------
ALTER TABLE plans
  ADD COLUMN description VARCHAR(500) NULL DEFAULT NULL AFTER name,
  ADD COLUMN razorpay_plan_id VARCHAR(64) NULL DEFAULT NULL AFTER max_api_calls_per_day,
  ADD COLUMN paypal_product_id VARCHAR(64) NULL DEFAULT NULL AFTER razorpay_plan_id,
  ADD COLUMN paypal_plan_id VARCHAR(64) NULL DEFAULT NULL AFTER paypal_product_id;

ALTER TABLE plans
  ADD UNIQUE KEY uk_plans_razorpay_plan_id (razorpay_plan_id),
  ADD UNIQUE KEY uk_plans_paypal_plan_id (paypal_plan_id);

-- ----------------------------------------------------------------------------
-- 2. COMPANY_SUBSCRIPTIONS — widen the state machine, add generic gateway
-- linkage (one set of columns shared by both gateways — a given
-- subscription is only ever billed through ONE gateway at a time, so there
-- is no need for separate razorpay_* and paypal_* columns here), and add
-- the updated_at column it's missing today.
--
-- Existing 7 rows: `status` values already in use ('trial','active') are a
-- strict subset of the new enum — safe. `gateway` defaults 'manual' for all
-- of them, which is factually correct (every existing subscription was
-- operator/self-service-provisioned, none went through a payment gateway).
-- ----------------------------------------------------------------------------
ALTER TABLE company_subscriptions
  MODIFY COLUMN status ENUM('trial','pending','active','past_due','suspended','cancelled','expired','payment_failed') NOT NULL DEFAULT 'trial',
  ADD COLUMN gateway ENUM('manual','razorpay','paypal') NOT NULL DEFAULT 'manual' AFTER plan_id,
  ADD COLUMN gateway_subscription_id VARCHAR(64) NULL DEFAULT NULL AFTER gateway,
  ADD COLUMN gateway_customer_id VARCHAR(64) NULL DEFAULT NULL AFTER gateway_subscription_id,
  ADD COLUMN gateway_customer_email VARCHAR(191) NULL DEFAULT NULL AFTER gateway_customer_id,
  ADD COLUMN next_billing_at DATE NULL DEFAULT NULL AFTER ends_at,
  ADD COLUMN last_payment_at DATE NULL DEFAULT NULL AFTER next_billing_at,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE company_subscriptions
  ADD UNIQUE KEY uk_company_subscriptions_gateway_sub (gateway, gateway_subscription_id);

-- ----------------------------------------------------------------------------
-- 3. SUBSCRIPTION_PAYMENTS — one row per successful/refunded/reversed
-- PLATFORM billing transaction, from EITHER gateway (distinct from the
-- tenant's own `payments` table, which bills the tenant's leads/students).
-- Uniqueness is (gateway, gateway_transaction_id) — transaction IDs are
-- only unique WITHIN a gateway's own namespace, not across both — this is
-- what makes a duplicate webhook delivery a guaranteed no-op.
-- ----------------------------------------------------------------------------
CREATE TABLE subscription_payments (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  subscription_id INT(10) UNSIGNED NOT NULL,
  plan_id INT(10) UNSIGNED NOT NULL,
  gateway ENUM('razorpay','paypal') NOT NULL,
  gateway_transaction_id VARCHAR(64) NULL DEFAULT NULL,
  gateway_order_id VARCHAR(64) NULL DEFAULT NULL,
  gateway_subscription_id VARCHAR(64) NULL DEFAULT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('completed','refunded','reversed','failed') NOT NULL DEFAULT 'completed',
  billing_cycle ENUM('trial','monthly','quarterly','yearly') NULL DEFAULT NULL,
  invoice_reference VARCHAR(100) NULL DEFAULT NULL,
  payment_date DATE NOT NULL,
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subscription_payments_gateway_txn (gateway, gateway_transaction_id),
  KEY idx_subscription_payments_company (company_id),
  KEY idx_subscription_payments_subscription (subscription_id),
  CONSTRAINT fk_subscription_payments_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_subscription_payments_subscription FOREIGN KEY (subscription_id) REFERENCES company_subscriptions(id),
  CONSTRAINT fk_subscription_payments_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------------------------------------------------------
-- 4. PAYMENT_WEBHOOK_EVENTS — idempotency ledger shared by both gateways.
-- Uniqueness is (gateway, event_id) — event IDs are only unique within a
-- gateway's own namespace.
-- ----------------------------------------------------------------------------
CREATE TABLE payment_webhook_events (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  gateway ENUM('razorpay','paypal') NOT NULL,
  event_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NULL DEFAULT NULL,
  company_id INT(10) UNSIGNED NULL DEFAULT NULL,
  status ENUM('received','processed','failed') NOT NULL DEFAULT 'received',
  payload LONGTEXT NULL DEFAULT NULL,
  error_message VARCHAR(500) NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_payment_webhook_events_gateway_event (gateway, event_id),
  KEY idx_payment_webhook_events_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ============================================================================
-- EXISTING DATA AFFECTED
-- ============================================================================
-- plans: 1 existing row gets description=NULL, razorpay_plan_id=NULL,
--   paypal_product_id=NULL, paypal_plan_id=NULL. No existing value changed.
-- company_subscriptions: 7 existing rows get gateway='manual' (accurate),
--   gateway_subscription_id/customer_id/email=NULL, next_billing_at/
--   last_payment_at=NULL, updated_at=NOW() at migration time. `status`
--   values already in use ('trial','active') remain valid under the wider
--   enum — no row's status changes.
-- subscription_payments / payment_webhook_events: brand-new, empty tables.
-- The tenant's own `payments` / `payment_plans` / `payment_installments`
--   tables (lead/student billing) are completely untouched.
--
-- ============================================================================
-- ROLLBACK SQL
-- ============================================================================
-- DROP TABLE payment_webhook_events;
-- DROP TABLE subscription_payments;
-- ALTER TABLE company_subscriptions
--   DROP KEY uk_company_subscriptions_gateway_sub,
--   DROP COLUMN updated_at, DROP COLUMN last_payment_at, DROP COLUMN next_billing_at,
--   DROP COLUMN gateway_customer_email, DROP COLUMN gateway_customer_id, DROP COLUMN gateway_subscription_id,
--   DROP COLUMN gateway,
--   MODIFY COLUMN status ENUM('trial','active','expired','cancelled') NOT NULL DEFAULT 'trial';
-- ALTER TABLE plans
--   DROP KEY uk_plans_paypal_plan_id, DROP KEY uk_plans_razorpay_plan_id,
--   DROP COLUMN paypal_plan_id, DROP COLUMN paypal_product_id, DROP COLUMN razorpay_plan_id, DROP COLUMN description;
--
-- ============================================================================
-- VERIFICATION SQL
-- ============================================================================
-- SHOW COLUMNS FROM plans LIKE '%razorpay%';
-- SHOW COLUMNS FROM plans LIKE '%paypal%';
-- SHOW COLUMNS FROM company_subscriptions;
-- SHOW TABLES LIKE 'subscription_payments';
-- SHOW TABLES LIKE 'payment_webhook_events';
-- SELECT id, name, status, gateway, gateway_subscription_id FROM company_subscriptions;  -- expect all 7 rows, gateway='manual'
-- SELECT COUNT(*) FROM plans;  -- expect 1 (unchanged)
-- SELECT COUNT(*) FROM payments;  -- expect UNCHANGED count (the separate lead/student payments table)
