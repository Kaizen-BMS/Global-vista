-- ============================================================================
-- Migration: Duration-based pricing (Hostinger-style)
--
-- A plan's existing `price` column stays the implicit 1-month price —
-- nothing about it changes, so every existing checkout/dashboard/pricing
-- display keeps working unmodified. This table adds OPTIONAL longer
-- commitment tiers (12/24/36 months, or any admin-chosen length) with
-- their own admin-set price — no fixed discount formula, full manual
-- control per tier, per plan.
--
-- `price` here is the PER-MONTH price for that tier (what's shown to the
-- customer, e.g. "Rs.299/mo billed every 24 months") — the actual lump sum
-- charged per cycle is price * duration_months (and, for a per_user plan,
-- also * the company's active seat count, exactly like the existing
-- monthly per-user billing already does via Razorpay's subscription
-- quantity).
-- ============================================================================

CREATE TABLE plan_duration_prices (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id INT(10) UNSIGNED NOT NULL,
  duration_months INT(10) UNSIGNED NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  razorpay_plan_id VARCHAR(64) NULL DEFAULT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_plan_duration (plan_id, duration_months),
  CONSTRAINT fk_plan_duration_prices_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which duration (in months) a company's subscription actually committed
-- to — needed so the maintenance-fee subscription (billed on the same
-- cadence, see changeCompanyRazorpayPlan/createRazorpayCheckoutForCompany)
-- and any future renewal-length UI know the term without re-deriving it.
ALTER TABLE company_subscriptions
  ADD COLUMN commitment_months INT(10) UNSIGNED NOT NULL DEFAULT 1 AFTER seat_quantity;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — plan_duration_prices starts empty (every
-- plan just keeps behaving as pure 1-month billing until you add tiers),
-- and commitment_months defaults to 1 for every existing subscription row.
--
-- OPTIONAL — example tiers for Silver (adjust the plan_id/prices before
-- running; this is NOT auto-run):
--
-- INSERT INTO plan_duration_prices (plan_id, duration_months, price) VALUES
--   (2, 12, 349.00),
--   (2, 24, 299.00),
--   (2, 36, 249.00);
-- -- (plan_id 2 = Silver, if you used the earlier seed SQL as-is; check
-- -- SELECT id, name FROM plans; first to confirm the real id.)
--
-- ROLLBACK SQL:
-- ALTER TABLE company_subscriptions DROP COLUMN commitment_months;
-- DROP TABLE IF EXISTS plan_duration_prices;
--
-- VERIFICATION SQL:
-- SHOW TABLES LIKE 'plan_duration_prices';
-- SHOW COLUMNS FROM company_subscriptions LIKE 'commitment_months';
-- ============================================================================
