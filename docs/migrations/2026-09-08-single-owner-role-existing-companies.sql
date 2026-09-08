-- Follow-up to 2026-09-08-single-owner-role-template.sql: that migration
-- only changed the GLOBAL templates (company_id IS NULL) that NEW
-- companies clone from — it deliberately left every already-provisioned
-- company's own roles untouched. This migration applies the same
-- consolidation to every EXISTING company, verified safe first:
--
-- Live check (before writing this) against all 10 companies that have
-- their own "Admin"/"Super Admin" roles: every single one has exactly
-- 0 users on "Admin" and exactly 1 (the owner) on "Super Admin" — nobody
-- has ever actually used the extra Admin role. So:
--
--   1. Rename every company's own "Super Admin" role to "Company Owner"
--      — SLUG is left untouched (super-admin), so isSuperAdmin() and
--      every billing/RLS check that keys off it keeps working exactly
--      as before. Purely a display-name change.
--   2. Soft-delete every company's own "Admin" role — guarded by
--      NOT EXISTS so it only touches a company's Admin role if it truly
--      has zero users on it (matches every company today, but this
--      guard makes the statement safe to re-run later without silently
--      orphaning anyone if that ever changes).
--
-- Any OTHER roles a company has already created for itself (custom roles
-- beyond these two) are completely untouched — those are exactly the
-- "dynamic, created by the owner" roles this change is meant to leave
-- alone.

UPDATE roles
SET name = 'Company Owner'
WHERE company_id IS NOT NULL AND slug = 'super-admin' AND is_deleted = 0;

UPDATE roles
SET is_deleted = 1, deleted_at = NOW()
WHERE company_id IS NOT NULL AND slug = 'admin' AND is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.role_id = roles.id AND u.is_deleted = 0);
