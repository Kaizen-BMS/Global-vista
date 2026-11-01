-- WHY: "Switch to Child Company" (src/lib/actions/companySwitch.js) was
-- hardcoded to the permanent is_super_admin account flag — only the one
-- literal GVE super-admin account could ever switch into a school. The
-- user wants this opened up to any employee, controlled per-role via the
-- existing Roles & Permissions screen, same as every other capability in
-- the app.
INSERT INTO permissions (name, slug, module, module_slug, status)
VALUES ('Switch to Child Company', 'companies.switch', 'companies', 'core', 'active');

-- Rollback:
-- DELETE FROM role_permissions WHERE permission_id = (SELECT id FROM permissions WHERE slug = 'companies.switch');
-- DELETE FROM permissions WHERE slug = 'companies.switch';

-- Verification:
-- SELECT * FROM permissions WHERE slug = 'companies.switch';
