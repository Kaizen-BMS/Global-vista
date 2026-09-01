-- ============================================================================
-- Migration: Partner / Affiliate Program
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- Platform-level content (NOT company-scoped) — a "partner" is an
-- influencer/affiliate who promotes KaizenBMS and gets their own coupon
-- code to track it. This is deliberately built ON TOP OF the existing
-- coupons system rather than a parallel one: a partner's tracking code IS
-- a real row in `coupons` (it works at checkout exactly like any other
-- coupon already does), just tagged with which partner it belongs to via
-- the new `coupons.partner_id` column — so "how many people used it" and
-- "does it actually discount checkout" reuse everything already proven to
-- work (coupon_redemptions, validateCouponForPlan, redeemCoupon).
-- ============================================================================

CREATE TABLE partners (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(191) NULL DEFAULT NULL,
  phone VARCHAR(20) NULL DEFAULT NULL,
  notes TEXT NULL DEFAULT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE coupons
  ADD COLUMN partner_id INT(10) UNSIGNED NULL DEFAULT NULL AFTER code,
  ADD CONSTRAINT fk_coupons_partner FOREIGN KEY (partner_id) REFERENCES partners(id);

-- ============================================================================
-- EXISTING DATA AFFECTED: none — partners is a new, empty table; every
-- existing coupon gets partner_id=NULL (an ordinary, non-partner coupon,
-- exactly what it already was).
--
-- ROLLBACK SQL:
-- ALTER TABLE coupons DROP FOREIGN KEY fk_coupons_partner, DROP COLUMN partner_id;
-- DROP TABLE partners;
--
-- VERIFICATION SQL:
-- SHOW TABLES LIKE 'partners';
-- SHOW COLUMNS FROM coupons LIKE 'partner_id';
-- ============================================================================
