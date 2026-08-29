-- ============================================================================
-- Migration: Tiered plans (Trial/Silver/Gold/Diamond) — seat-based pricing,
-- annual maintenance fee, marketing-comparison fields, and an
-- import/export feature gate.
--
-- `pricing_model` defaults to 'flat' for every existing row, so the two
-- plans already live today (Starter, testing pack for razorpay) keep
-- behaving exactly as they do now — nothing about existing billing changes
-- until a plan is explicitly marked 'per_user'. For a 'per_user' plan,
-- `price` is reinterpreted as the PER-SEAT monthly price (charged ×
-- however many active employees the company has), not a flat plan price.
-- ============================================================================

ALTER TABLE plans
  ADD COLUMN pricing_model ENUM('flat','per_user') NOT NULL DEFAULT 'flat' AFTER billing_cycle,
  ADD COLUMN maintenance_annual_fee DECIMAL(10,2) NULL DEFAULT NULL AFTER price,
  ADD COLUMN registration_label VARCHAR(50) NOT NULL DEFAULT 'Self' AFTER maintenance_annual_fee,
  ADD COLUMN development_cost_label VARCHAR(50) NOT NULL DEFAULT 'Free' AFTER registration_label,
  ADD COLUMN installation_cost_label VARCHAR(50) NOT NULL DEFAULT 'Free' AFTER development_cost_label,
  ADD COLUMN allow_import_export TINYINT(1) NOT NULL DEFAULT 1 AFTER max_api_calls_per_day,
  ADD COLUMN maintenance_razorpay_plan_id VARCHAR(64) NULL DEFAULT NULL AFTER razorpay_plan_id;

-- The second, parallel recurring subscription for a plan's annual
-- maintenance fee — a company on a 'per_user' plan with a
-- maintenance_annual_fee gets TWO real Razorpay subscriptions running side
-- by side (per-seat monthly + maintenance yearly), since Razorpay bills one
-- recurring amount per subscription object, not "amount + annual add-on".
ALTER TABLE company_subscriptions
  ADD COLUMN maintenance_gateway_subscription_id VARCHAR(64) NULL DEFAULT NULL AFTER gateway_subscription_id,
  ADD COLUMN seat_quantity INT UNSIGNED NOT NULL DEFAULT 1 AFTER maintenance_gateway_subscription_id;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — every new column has a safe default
-- (pricing_model='flat' for the 2 plans that already exist; nothing about
-- the 8 live company_subscriptions rows changes).
--
-- OPTIONAL — seed the four tiers from the pricing sheet (adjust values/
-- currency before running; these are NOT auto-run, review first):
--
-- INSERT INTO plans (name, slug, billing_cycle, pricing_model, price, maintenance_annual_fee, currency, registration_label, development_cost_label, installation_cost_label, trial_days, max_users, max_storage_mb, allow_import_export, status)
-- VALUES
--   ('Trial',   'trial-tier',   'trial',   'flat',     0,      NULL, 'INR', 'Self', 'Free', 'Free', 30, 4,    250,  0, 'active'),
--   ('Silver',  'silver',       'monthly', 'per_user', 399.00, 999.00, 'INR', 'Self', 'Free', 'Free', NULL, NULL, 250,  1, 'active'),
--   ('Gold',    'gold',         'monthly', 'per_user', 550.00, 499.00, 'INR', 'Self', 'Free', 'Free', NULL, NULL, 1024, 1, 'active'),
--   ('Diamond', 'diamond',      'monthly', 'per_user', 599.00, NULL,   'INR', 'Self', 'Free', 'Free', NULL, NULL, NULL, 1, 'active');
--
-- ROLLBACK SQL:
-- ALTER TABLE company_subscriptions DROP COLUMN seat_quantity, DROP COLUMN maintenance_gateway_subscription_id;
-- ALTER TABLE plans DROP COLUMN maintenance_razorpay_plan_id, DROP COLUMN allow_import_export, DROP COLUMN installation_cost_label, DROP COLUMN development_cost_label, DROP COLUMN registration_label, DROP COLUMN maintenance_annual_fee, DROP COLUMN pricing_model;
--
-- VERIFICATION SQL:
-- SHOW COLUMNS FROM plans LIKE 'pricing_model';
-- SHOW COLUMNS FROM company_subscriptions LIKE 'seat_quantity';
-- ============================================================================
