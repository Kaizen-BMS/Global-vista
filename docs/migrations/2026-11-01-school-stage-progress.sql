-- ============================================================================
-- Migration: Stage completion tracking + Registration Number / Parent Name
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-11-01 immediately before writing this.
--
-- WHY: schools need to see, per student, whether their CURRENT workshop
-- stage has actually been finished (counsellor marked it complete) before
-- moving them on to the next one — orthogonal to which stage they're in.
-- One nullable column, additive, read/written only by the new school-only
-- "Mark Complete" / "Move to Next Stage" actions; every other company
-- never sets it.
-- ============================================================================

ALTER TABLE leads ADD COLUMN stage_completed_at TIMESTAMP NULL DEFAULT NULL AFTER stage;

-- ----------------------------------------------------------------------------
-- Registration Number / Parent Name — seeded as custom fields (same
-- mechanism as "Stream", see 2026-10-31-school-pipeline-stages.sql) for the
-- 5 existing schools. Future schools get these automatically at provision
-- time (src/lib/platform/actions/provisioning.js).
-- ----------------------------------------------------------------------------
-- (seeded via a one-off script, not inline INSERT, since display_order
-- must be computed per-company against whatever's already in that
-- company's "Student Information" section — see implementation notes)

-- ============================================================================
-- EXISTING DATA AFFECTED: none — stage_completed_at defaults NULL for every
-- existing row; the two new custom fields are new rows, no existing row
-- touched.
--
-- ROLLBACK SQL:
-- ALTER TABLE leads DROP COLUMN stage_completed_at;
-- DELETE FROM lead_custom_fields WHERE field_key IN ('registration_number','parent_name') AND company_id IN (28,29,30,31,32);
--
-- VERIFICATION SQL:
-- SHOW COLUMNS FROM leads LIKE 'stage_completed_at';
-- SELECT company_id, field_key, label FROM lead_custom_fields WHERE field_key IN ('registration_number','parent_name');
-- ============================================================================
