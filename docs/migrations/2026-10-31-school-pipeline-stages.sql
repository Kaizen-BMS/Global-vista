-- ============================================================================
-- Migration: Per-company pipeline stages for schools (child companies)
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-10-31 immediately before writing this
-- (confirmed leads.stage is varchar(50), not an ENUM -- no change needed on
-- the `leads` table itself; confirmed 5 existing schools, company ids
-- 28-32, all under parent company 10, with 29 leads total, all at the
-- default "New Lead" stage -- no legacy stage data to migrate).
--
-- WHY this table: schools want to replace the generic sales-pipeline stage
-- names with their own workshop stages, and keep adding new ones live via
-- an "Add+" affordance on the Kanban board. A hardcoded second array can't
-- support that. This mirrors the existing `lead_field_sections` pattern
-- (company-scoped config table, "no row = today's default") exactly --
-- a brand-new or untouched company needs zero rows to keep rendering the
-- current hardcoded LEAD_STAGES exactly as today.
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_pipeline_stages (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INT(10) UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  updated_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_lead_pipeline_stages_company_name (company_id, name),
  KEY idx_lead_pipeline_stages_company (company_id),
  CONSTRAINT fk_lead_pipeline_stages_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------------------------------------------------------
-- Backfill: seed the 4 default workshop stages for the 5 schools that
-- already exist (ids 28-32), so they don't have to wait for a re-provision.
-- Future schools get these same 4 rows automatically at provision time
-- (see src/lib/platform/actions/provisioning.js).
-- ----------------------------------------------------------------------------
INSERT INTO lead_pipeline_stages (company_id, name, display_order) VALUES
  (28, 'Group Workshop 1', 0), (28, 'Micro Group Session', 1), (28, 'Group Workshop 2', 2), (28, '1 to 1 Session 1', 3),
  (29, 'Group Workshop 1', 0), (29, 'Micro Group Session', 1), (29, 'Group Workshop 2', 2), (29, '1 to 1 Session 1', 3),
  (30, 'Group Workshop 1', 0), (30, 'Micro Group Session', 1), (30, 'Group Workshop 2', 2), (30, '1 to 1 Session 1', 3),
  (31, 'Group Workshop 1', 0), (31, 'Micro Group Session', 1), (31, 'Group Workshop 2', 2), (31, '1 to 1 Session 1', 3),
  (32, 'Group Workshop 1', 0), (32, 'Micro Group Session', 1), (32, 'Group Workshop 2', 2), (32, '1 to 1 Session 1', 3);

-- ============================================================================
-- EXISTING DATA AFFECTED: none beyond the new rows above -- `leads` itself is
-- untouched (existing leads keep their current "New Lead" stage string; a
-- school's Kanban board will just show them in an "Unmatched" bucket until
-- moved, since StageBadge/Kanban already fall back gracefully for a stage
-- value not in the active list).
--
-- ROLLBACK SQL:
-- DROP TABLE lead_pipeline_stages;
--
-- VERIFICATION SQL:
-- SHOW CREATE TABLE lead_pipeline_stages;
-- SELECT company_id, name, display_order FROM lead_pipeline_stages ORDER BY company_id, display_order;
-- ============================================================================
