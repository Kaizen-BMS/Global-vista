-- ============================================================================
-- Migration: Lead Meetings + Typed Notes
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-08-17 immediately before writing this.
--
-- Meetings are genuinely new — confirmed via full codebase + schema audit
-- that no meeting/appointment table or scheduling logic exists anywhere.
-- "Meeting" today is only one value of lead_followups.type, used for the
-- quick-log button (a single freeform note, no date range/location/link) —
-- that quick-log path is left completely untouched by this migration.
--
-- lead_notes currently has NO type/category column (plain freeform text) —
-- this adds one so notes can be tagged General/Call/Meeting/Follow-up/
-- Internal in the new unified activity timeline.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LEAD_NOTES — add a type column. Existing rows default to 'general',
-- which is accurate (every note ever added had no type concept until now).
-- ----------------------------------------------------------------------------
ALTER TABLE lead_notes
  ADD COLUMN type ENUM('general','call','meeting','follow_up','internal') NOT NULL DEFAULT 'general' AFTER visibility;

-- ----------------------------------------------------------------------------
-- 2. LEAD_MEETINGS — real scheduled meetings, distinct from the existing
-- lead_followups.type='Meeting' quick-log. Mirrors lead_followups'
-- conventions (status enum, created_by/updated_by, UTC timestamps resolved
-- from the company's configured timezone at write time — never a raw
-- browser-local value) so the same code patterns (RLS, timezone handling,
-- reminders) apply with no new concepts to learn.
-- ----------------------------------------------------------------------------
CREATE TABLE lead_meetings (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  lead_id INT(10) UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  meeting_type ENUM('Online','Phone','In Person','Other') NOT NULL DEFAULT 'Online',
  location_or_url VARCHAR(500) NULL DEFAULT NULL,
  participants VARCHAR(500) NULL DEFAULT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status ENUM('Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  notes TEXT NULL DEFAULT NULL,
  outcome VARCHAR(255) NULL DEFAULT NULL,
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  updated_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead_meetings_company (company_id),
  KEY idx_lead_meetings_lead (lead_id),
  KEY idx_lead_meetings_starts_at (starts_at),
  CONSTRAINT fk_lead_meetings_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lead_meetings_lead FOREIGN KEY (lead_id) REFERENCES leads(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ============================================================================
-- EXISTING DATA AFFECTED
-- ============================================================================
-- lead_notes: every existing row gets type='general'. No content/visibility/
--   pin state changed.
-- lead_meetings: brand-new, empty table. lead_followups (incl. its existing
--   type='Meeting' quick-log rows) is completely untouched.
--
-- ============================================================================
-- ROLLBACK SQL
-- ============================================================================
-- DROP TABLE lead_meetings;
-- ALTER TABLE lead_notes DROP COLUMN type;
--
-- ============================================================================
-- VERIFICATION SQL
-- ============================================================================
-- SHOW COLUMNS FROM lead_notes LIKE 'type';
-- SHOW TABLES LIKE 'lead_meetings';
-- SHOW CREATE TABLE lead_meetings;
-- SELECT COUNT(*) FROM lead_notes;    -- expect unchanged count
-- SELECT COUNT(*) FROM lead_followups; -- expect unchanged count (untouched)
