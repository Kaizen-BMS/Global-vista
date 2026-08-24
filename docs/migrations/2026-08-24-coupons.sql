-- ============================================================================
-- Migration: Coupon codes for subscription checkout
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- Platform-level content (NOT company-scoped) — coupons are created and
-- managed exclusively by a Platform Operator (users.is_platform_operator = 1,
-- checked in code via assertPlatformOperator(session)). Applied at BillDesk
-- checkout time (both the public registration flow and an existing
-- company's plan-change flow) to discount the amount actually charged.
--
-- `company_subscriptions` gets two new NULLable columns recording which
-- coupon (if any) was applied to that subscription's most recent checkout —
-- purely additive, no existing column touched, no existing row affected.
-- ============================================================================

CREATE TABLE coupons (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  discount_type ENUM('percent','fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_redemptions INT UNSIGNED NULL DEFAULT NULL,
  redemption_count INT UNSIGNED NOT NULL DEFAULT 0,
  valid_from DATETIME NULL DEFAULT NULL,
  valid_until DATETIME NULL DEFAULT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One redemption per company subscription — a coupon discounts a
-- subscription's checkout once, not every renewal. UNIQUE on
-- subscription_id also makes redemption recording idempotent if a webhook
-- and the return-URL confirmation both fire for the same payment.
CREATE TABLE coupon_redemptions (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id INT(10) UNSIGNED NOT NULL,
  company_id INT(10) UNSIGNED NOT NULL,
  subscription_id INT(10) UNSIGNED NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupon_redemptions_subscription (subscription_id),
  KEY idx_coupon_redemptions_coupon (coupon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE company_subscriptions
  ADD COLUMN coupon_id INT(10) UNSIGNED NULL DEFAULT NULL AFTER gateway_subscription_id,
  ADD COLUMN coupon_discount_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER coupon_id;

-- ============================================================================
-- ROLLBACK (only if you need to undo this migration)
-- ============================================================================
-- ALTER TABLE company_subscriptions DROP COLUMN coupon_id, DROP COLUMN coupon_discount_amount;
-- DROP TABLE IF EXISTS coupon_redemptions;
-- DROP TABLE IF EXISTS coupons;
