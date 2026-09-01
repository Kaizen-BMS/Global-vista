-- ============================================================================
-- Migration: Per-employee notification preferences
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- The company owner already has a COMPANY-WIDE on/off switch per category
-- (Settings > Organizational Setting > Notifications, crm_settings group
-- 'notifications', e.g. notify_leads/notify_payments/...) — turning one off
-- there stops it being created for EVERYONE in the company. This adds a
-- SECOND, personal layer on top: each employee can additionally mute a
-- category just for themselves, from their own Notifications page. A
-- notification only ever fires when BOTH layers allow it — the company
-- switch is checked first (unchanged), then this per-user one.
-- ============================================================================

CREATE TABLE user_notification_preferences (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT(10) UNSIGNED NOT NULL,
  category VARCHAR(30) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_notification_pref (user_id, category),
  CONSTRAINT fk_user_notification_pref_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — new, empty table. No row for a given
-- (user, category) means "enabled" (fail-open, same convention as the
-- company-wide switch), so every existing user's notifications keep
-- arriving exactly as before until they explicitly mute something.
--
-- ROLLBACK SQL:
-- DROP TABLE user_notification_preferences;
--
-- VERIFICATION SQL:
-- SHOW TABLES LIKE 'user_notification_preferences';
-- ============================================================================
