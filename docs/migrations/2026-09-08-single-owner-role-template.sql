-- Company signup used to clone TWO global role templates into every new
-- company: "Super Admin" (slug super-admin) and "Admin" (slug admin) —
-- the owner account was assigned Super Admin, and the extra Admin role
-- sat there unused unless the owner happened to use it. The company
-- wants signup to seed exactly ONE role going forward — "Company Owner"
-- — with every other role created by the owner themselves, dynamically,
-- for whatever their business actually needs.
--
-- provisioning.js clones every non-deleted `roles` row where
-- company_id IS NULL, matched by SLUG (not name) to decide who the new
-- owner user gets assigned to (`slug = 'super-admin'`). That slug is also
-- hardcoded in src/lib/helpers/permissions.js's isSuperAdmin() — the
-- single switch every billing gate, admin-only screen, and row-level
-- security check in this app relies on. So this migration:
--   1. Renames the DISPLAY NAME of the super-admin template to
--      "Company Owner" — the slug itself is left untouched, so every
--      permission/billing check that depends on it keeps working exactly
--      as before, for both future and already-provisioned companies.
--   2. Soft-deletes the "Admin" template (is_deleted=1, matching how the
--      other 7 old template roles — Accounts, Marketing, etc. — were
--      already retired) so provisioning's "clone every non-deleted
--      template" step only ever finds the one Company Owner template
--      from now on.
--
-- This does NOT touch any already-provisioned company's own roles table
-- rows (each company's own cloned "Admin"/"Super Admin" copies, or any
-- roles they created themselves) — only the global templates that future
-- signups clone from. An existing company that wants to consolidate down
-- to a single role can safely delete its own unused "Admin" role from
-- Settings → Roles at any time (the UI already blocks deleting a role
-- that still has users assigned, and offers to reassign them first).

UPDATE roles
SET name = 'Company Owner',
    description = 'Full access — the company owner''s own role, assigned automatically at signup.'
WHERE id = 1 AND company_id IS NULL AND slug = 'super-admin';

UPDATE roles
SET is_deleted = 1, deleted_at = NOW()
WHERE id = 2 AND company_id IS NULL AND slug = 'admin' AND is_deleted = 0;
