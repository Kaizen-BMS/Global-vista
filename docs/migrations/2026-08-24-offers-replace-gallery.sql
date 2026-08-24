-- ============================================================================
-- Migration: Replace Gallery with Offers (platform-level marketing content)
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- Supersedes the earlier `gallery_images` table from
-- 2026-08-24-blog-and-gallery.sql. Verified against LIVE schema on
-- 2026-08-24: `gallery_images` had 0 rows (never used in production), so
-- dropping it loses no real data.
--
-- Platform-level content (NOT company-scoped) — managed exclusively by a
-- Platform Operator (users.is_platform_operator = 1, checked in code via
-- assertPlatformOperator(session)), rendered as a scrolling text strip on
-- the public marketing homepage. No FK on created_by, matching the existing
-- convention on company_subscriptions.created_by / blog_posts.created_by.
-- ============================================================================

DROP TABLE IF EXISTS gallery_images;

CREATE TABLE platform_offers (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  text VARCHAR(300) NOT NULL,
  sort_order INT(11) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_platform_offers_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ROLLBACK (only if you need to undo this migration)
-- ============================================================================
-- DROP TABLE IF EXISTS platform_offers;
