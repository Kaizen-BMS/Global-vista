-- ============================================================================
-- Migration: Lead Call Recording (Exotel bridge calling)
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- Lets an employee place a real phone call to a lead straight from the
-- lead page, with the call automatically recorded so the company owner
-- can verify it actually happened. Each company connects its OWN Exotel
-- account (SID/API key/token/Exophone) via Organizational Setting →
-- Calling Integration — reuses the existing generic crm_settings
-- key/value store (same table 'payments' and 'email' already use), so no
-- new settings table is needed, just a new `calling` group.
--
-- HOW A CALL WORKS: the employee clicks "Call" on a lead → the platform
-- asks Exotel to ring the EMPLOYEE's own registered mobile number first →
-- once they pick up, Exotel automatically bridges the call to the lead's
-- number → both legs are recorded on Exotel's side → Exotel posts the
-- call's final status + recording URL back to our webhook, which is
-- saved against this exact lead_calls row.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LEAD_CALLS — one row per call attempt.
-- ----------------------------------------------------------------------------
CREATE TABLE lead_calls (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  lead_id INT(10) UNSIGNED NOT NULL,
  employee_id INT(10) UNSIGNED NOT NULL,
  provider ENUM('exotel') NOT NULL DEFAULT 'exotel',
  provider_call_sid VARCHAR(64) NULL DEFAULT NULL,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  status ENUM('initiated','ringing','in-progress','completed','failed','no-answer','busy','canceled') NOT NULL DEFAULT 'initiated',
  duration_seconds INT UNSIGNED NULL DEFAULT NULL,
  recording_url VARCHAR(500) NULL DEFAULT NULL,
  started_at DATETIME NULL DEFAULT NULL,
  ended_at DATETIME NULL DEFAULT NULL,
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_lead_calls_provider_sid (provider_call_sid),
  KEY idx_lead_calls_company (company_id),
  KEY idx_lead_calls_lead (lead_id),
  KEY idx_lead_calls_employee (employee_id),
  CONSTRAINT fk_lead_calls_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lead_calls_lead FOREIGN KEY (lead_id) REFERENCES leads(id),
  CONSTRAINT fk_lead_calls_employee FOREIGN KEY (employee_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------------------------------------------------------
-- 2. PERMISSIONS — new leads.calls.make / leads.calls.view slugs, same
-- module_slug='crm' gate as every other lead permission. Auto-granted to
-- whichever roles already hold the closest existing permission, so an
-- existing company doesn't have to manually re-open Role Permissions
-- just to keep using leads the way they already could:
--   - leads.calls.make  → granted to every role that already has leads.update
--     (if you can already edit/act on a lead, you can call it)
--   - leads.calls.view  → granted to every role that already has leads.view
--     (viewing a lead's call log/recordings is a sub-view of the lead itself)
-- A Super Admin bypasses permission checks entirely regardless (see
-- can() in permissions.js), so the company owner can use this immediately.
-- ----------------------------------------------------------------------------
INSERT INTO permissions (name, slug, module, module_slug, status)
VALUES
  ('Make Lead Calls', 'leads.calls.make', 'leads', 'crm', 'active'),
  ('View Call Recordings', 'leads.calls.view', 'leads', 'crm', 'active');

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, (SELECT id FROM permissions WHERE slug = 'leads.calls.make')
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id AND p.slug = 'leads.update';

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, (SELECT id FROM permissions WHERE slug = 'leads.calls.view')
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id AND p.slug = 'leads.view';

-- ============================================================================
-- EXISTING DATA AFFECTED
-- ============================================================================
-- lead_calls: brand-new, empty table.
-- permissions: 2 new rows added, nothing existing changed.
-- role_permissions: new rows added ONLY for roles that already had
--   leads.update / leads.view — no existing grant touched or removed.
-- crm_settings: no schema change (generic key/value table) — a new
--   `calling` group of rows is created the first time a company saves its
--   Calling Integration settings; nothing exists there until then.
--
-- ============================================================================
-- ROLLBACK SQL
-- ============================================================================
-- DELETE rp FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE p.slug IN ('leads.calls.make','leads.calls.view');
-- DELETE FROM permissions WHERE slug IN ('leads.calls.make','leads.calls.view');
-- DROP TABLE lead_calls;
-- DELETE FROM crm_settings WHERE `group` = 'calling';
--
-- ============================================================================
-- VERIFICATION SQL
-- ============================================================================
-- SHOW TABLES LIKE 'lead_calls';
-- SELECT * FROM permissions WHERE slug LIKE 'leads.calls.%';
-- SELECT COUNT(*) FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE p.slug = 'leads.calls.make';
