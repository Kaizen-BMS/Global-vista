-- ============================================================================
-- Migration: Blog + Gallery (platform-level marketing content)
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-08-24 immediately before writing this
-- — confirmed no `blog_posts`/`gallery_images` tables exist anywhere.
--
-- Platform-level content (NOT company-scoped) — managed exclusively by a
-- Platform Operator (users.is_platform_operator = 1, checked in code via
-- assertPlatformOperator(session), same gate already used elsewhere in
-- src/lib/platform/actions/*), shown on the public marketing homepage and
-- the public /blog pages. No FK on created_by, matching the existing
-- convention on company_subscriptions.created_by / plans (soft reference,
-- not hard-constrained).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BLOG POSTS
-- ----------------------------------------------------------------------------
CREATE TABLE blog_posts (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  excerpt VARCHAR(500) NULL DEFAULT NULL,
  content LONGTEXT NOT NULL,
  cover_image_url VARCHAR(500) NULL DEFAULT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL DEFAULT NULL,
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_blog_posts_slug (slug),
  KEY idx_blog_posts_status_published (status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. GALLERY IMAGES
-- ----------------------------------------------------------------------------
CREATE TABLE gallery_images (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NULL DEFAULT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT(11) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gallery_images_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ROLLBACK (only if you need to undo this migration)
-- ============================================================================
-- DROP TABLE IF EXISTS blog_posts;
-- DROP TABLE IF EXISTS gallery_images;
