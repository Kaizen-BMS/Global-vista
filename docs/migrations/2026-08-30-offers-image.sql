-- ============================================================================
-- Migration: Offer banner images
-- Lets a Platform Operator upload an actual image (a festival/sale
-- graphic) for an offer, not just plain text — used specifically by the
-- banner shown above the pricing cards on /platform-home. The existing
-- top-of-page scrolling strip stays text-only (a scrolling image doesn't
-- read well); this only affects the pricing banner's rendering.
-- ============================================================================

ALTER TABLE platform_offers
  ADD COLUMN image_url VARCHAR(500) NULL DEFAULT NULL AFTER text;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — new column defaults to NULL, every
-- existing offer keeps rendering as text-only.
--
-- ROLLBACK SQL:
-- ALTER TABLE platform_offers DROP COLUMN image_url;
--
-- VERIFICATION SQL:
-- SHOW COLUMNS FROM platform_offers LIKE 'image_url';
-- ============================================================================
