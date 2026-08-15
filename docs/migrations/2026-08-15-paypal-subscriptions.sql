-- ============================================================================
-- Migration: PayPal Subscription Billing
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-08-15 before writing this.
-- Existing `payments`/`payment_plans`/`payment_installments` are the
-- TENANT'S OWN customer-billing module (company -> its leads), keyed off
-- lead_id/service_id — a different bounded context from "company pays the
-- platform for its CRM subscription". Reusing them would conflate the two,
-- so this adds a separate, parallel set of platform-billing tables instead.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PLANS — add description + PayPal product/plan mapping.
-- Existing rows: description defaults NULL (shown as blank until an
-- operator fills it in via Settings); paypal_product_id/paypal_plan_id
-- default NULL (existing plans are simply "not yet synced to PayPal" until
-- an operator explicitly triggers that, per Part 5 — never created
-- automatically on page load).
-- ----------------------------------------------------------------------------
ALTER TABLE plans
  ADD COLUMN description VARCHAR(500) NULL DEFAULT NULL AFTER name,
  ADD COLUMN paypal_product_id VARCHAR(64) NULL DEFAULT NULL AFTER max_api_calls_per_day,
  ADD COLUMN paypal_plan_id VARCHAR(64) NULL DEFAULT NULL AFTER paypal_product_id;

ALTER TABLE plans
  ADD UNIQUE KEY uk_plans_paypal_plan_id (paypal_plan_id);

-- ----------------------------------------------------------------------------
-- 2. COMPANY_SUBSCRIPTIONS — widen the state machine, add PayPal linkage,
-- add the updated_at column it's missing today.
-- Existing 7 rows: `status` values already in use ('trial','active') are a
-- strict subset of the new enum, so this ALTER is safe. `provider`
-- defaults 'manual' for all of them, which is factually correct — every
-- existing subscription was operator/self-service-provisioned, none went
-- through PayPal.
-- ----------------------------------------------------------------------------
ALTER TABLE company_subscriptions
  MODIFY COLUMN status ENUM('trial','pending','active','past_due','suspended','cancelled','expired','payment_failed') NOT NULL DEFAULT 'trial',
  ADD COLUMN provider ENUM('manual','paypal') NOT NULL DEFAULT 'manual' AFTER plan_id,
  ADD COLUMN paypal_subscription_id VARCHAR(64) NULL DEFAULT NULL AFTER provider,
  ADD COLUMN paypal_payer_id VARCHAR(64) NULL DEFAULT NULL AFTER paypal_subscription_id,
  ADD COLUMN paypal_payer_email VARCHAR(191) NULL DEFAULT NULL AFTER paypal_payer_id,
  ADD COLUMN next_billing_at DATE NULL DEFAULT NULL AFTER ends_at,
  ADD COLUMN last_payment_at DATE NULL DEFAULT NULL AFTER next_billing_at,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE company_subscriptions
  ADD UNIQUE KEY uk_company_subscriptions_paypal_sub (paypal_subscription_id);

-- ----------------------------------------------------------------------------
-- 3. SUBSCRIPTION_PAYMENTS — one row per successful/refunded/reversed
-- PLATFORM billing transaction (distinct from the tenant's own `payments`
-- table). paypal_transaction_id is UNIQUE so a duplicate webhook can never
-- create a second row for the same PayPal transaction.
-- ----------------------------------------------------------------------------
CREATE TABLE subscription_payments (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  subscription_id INT(10) UNSIGNED NOT NULL,
  plan_id INT(10) UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  paypal_transaction_id VARCHAR(64) NULL DEFAULT NULL,
  paypal_subscription_id VARCHAR(64) NULL DEFAULT NULL,
  status ENUM('completed','refunded','reversed','failed') NOT NULL DEFAULT 'completed',
  billing_period_start DATE NULL DEFAULT NULL,
  billing_period_end DATE NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subscription_payments_txn (paypal_transaction_id),
  KEY idx_subscription_payments_company (company_id),
  KEY idx_subscription_payments_subscription (subscription_id),
  CONSTRAINT fk_subscription_payments_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_subscription_payments_subscription FOREIGN KEY (subscription_id) REFERENCES company_subscriptions(id),
  CONSTRAINT fk_subscription_payments_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------------------------------------------------------
-- 4. PAYPAL_WEBHOOK_EVENTS — idempotency ledger. event_id is PayPal's own
-- webhook event ID (unique per event PayPal ever sends); a duplicate
-- delivery hits the UNIQUE constraint and is a no-op, never double-applies.
-- ----------------------------------------------------------------------------
CREATE TABLE paypal_webhook_events (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
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
  UNIQUE KEY uk_paypal_webhook_events_event_id (event_id),
  KEY idx_paypal_webhook_events_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ============================================================================
-- EXISTING DATA AFFECTED
-- ============================================================================
-- plans: 1 existing row gets description=NULL, paypal_product_id=NULL,
--   paypal_plan_id=NULL. No existing value changed.
-- company_subscriptions: 7 existing rows get provider='manual' (accurate —
--   none of them are PayPal-originated), paypal_*=NULL, next_billing_at/
--   last_payment_at=NULL, updated_at=NOW() at migration time. `status`
--   values already in use ('trial','active') remain valid under the wider
--   enum — no row's status changes.
-- subscription_payments / paypal_webhook_events: brand-new, empty tables.
--
-- ============================================================================
-- ROLLBACK SQL
-- ============================================================================
-- DROP TABLE paypal_webhook_events;
-- DROP TABLE subscription_payments;
-- ALTER TABLE company_subscriptions
--   DROP KEY uk_company_subscriptions_paypal_sub,
--   DROP COLUMN updated_at, DROP COLUMN last_payment_at, DROP COLUMN next_billing_at,
--   DROP COLUMN paypal_payer_email, DROP COLUMN paypal_payer_id, DROP COLUMN paypal_subscription_id,
--   DROP COLUMN provider,
--   MODIFY COLUMN status ENUM('trial','active','expired','cancelled') NOT NULL DEFAULT 'trial';
-- ALTER TABLE plans
--   DROP KEY uk_plans_paypal_plan_id,
--   DROP COLUMN paypal_plan_id, DROP COLUMN paypal_product_id, DROP COLUMN description;
--
-- ============================================================================
-- VERIFICATION SQL
-- ============================================================================
-- SHOW COLUMNS FROM plans LIKE 'paypal%';
-- SHOW COLUMNS FROM company_subscriptions LIKE '%';
-- SHOW TABLES LIKE 'subscription_payments';
-- SHOW TABLES LIKE 'paypal_webhook_events';
-- SELECT id, name, status, provider, paypal_subscription_id FROM company_subscriptions;  -- expect all 7 rows, provider='manual'
-- SELECT COUNT(*) FROM plans;  -- expect 1 (unchanged)
