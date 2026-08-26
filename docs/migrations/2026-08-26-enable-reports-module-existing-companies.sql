-- ============================================================================
-- Migration: Enable the "Reports" module for all currently-active companies
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- NOT a schema change — no table/column added. This is a one-time DATA fix
-- needed because of a real code fix: workspace/reports/* pages never
-- actually checked the "Reports" module toggle (Platform Console's toggle
-- did nothing). Now that the pages enforce it (isModuleEnabledForCompany),
-- every existing company needs an explicit company_modules row for
-- "reports" — otherwise Reports disappears for everyone who could already
-- see it today. This preserves current behavior for all existing
-- companies; going forward, the Platform Console toggle is the real
-- control for both existing and new companies.
--
-- Verified 2026-08-26: modules.id = 12 for slug='reports'; zero
-- company_modules rows existed for it before this.
-- ============================================================================

INSERT INTO company_modules (company_id, module_id, enabled, licensed)
SELECT c.id, 12, 1, 1
FROM companies c
WHERE c.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM company_modules cm WHERE cm.company_id = c.id AND cm.module_id = 12
  );

-- ============================================================================
-- ROLLBACK (only if you need to undo this migration)
-- ============================================================================
-- DELETE FROM company_modules WHERE module_id = 12;
