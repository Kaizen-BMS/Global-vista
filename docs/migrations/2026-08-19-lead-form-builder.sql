-- ============================================================================
-- Migration: Company-Customizable Lead Form Builder
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-08-19 immediately before writing this.
--
-- WHY these two tables and nothing else:
-- `lead_custom_fields` / `lead_custom_field_values` already give companies
-- full control over CUSTOM fields (section, label, order, visibility,
-- required, per-surface toggles) — reused completely unchanged, not touched
-- by this migration at all.
--
-- What's missing is a place to configure the BUILT-IN fields (name, phone,
-- email, country, dob, ...) that live as physical `leads` columns, and a
-- real "section" entity that can be created empty (before any field is
-- assigned to it) and independently renamed/reordered/disabled/deleted.
-- Both are purely additive metadata/config layers — no `leads` column is
-- renamed, retyped, or dropped, and no existing table is altered.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LEAD FIELD SECTIONS — first-class section/category entity.
--    (lead_custom_fields.section stays a free-text column exactly as today;
--    a section rename here cascades into that column via application code,
--    the same way renameLeadCustomFieldSection already works.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_field_sections (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL DEFAULT NULL,
  display_order INT(10) UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  updated_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by INT(10) UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_lead_field_sections_company (company_id),
  CONSTRAINT fk_lead_field_sections_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lead_field_sections_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_lead_field_sections_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT fk_lead_field_sections_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------------------------------------------------------
-- 2. LEAD FIELD LAYOUT — per-company configuration for BUILT-IN fields.
--    One row per (company, field_key) that a company has actually
--    customized; a built-in field with NO row here simply renders with its
--    system default label/section/order/visibility (defined in application
--    code, never in the database) — so a brand-new company needs zero rows
--    to already see the current default Add Lead form.
--
--    `field_key` is the camelCase key the existing lead actions/API already
--    use (e.g. 'name', 'phone', 'currentQualification', 'leadSourceId') —
--    NOT a new column name, just a pointer to the existing physical column
--    via the field registry in code. No `leads` column is ever renamed.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_field_layout (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  section_id INT(10) UNSIGNED NULL DEFAULT NULL,
  label VARCHAR(200) NULL DEFAULT NULL,
  help_text VARCHAR(500) NULL DEFAULT NULL,
  placeholder VARCHAR(200) NULL DEFAULT NULL,
  show_on_lead_form TINYINT(1) NOT NULL DEFAULT 1,
  show_on_lead_detail TINYINT(1) NOT NULL DEFAULT 1,
  show_on_query_form TINYINT(1) NOT NULL DEFAULT 0,
  is_required_on_lead_form TINYINT(1) NOT NULL DEFAULT 0,
  is_required_on_query_form TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT(10) UNSIGNED NOT NULL DEFAULT 0,
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  updated_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_lead_field_layout_company_field (company_id, field_key),
  KEY idx_lead_field_layout_section (section_id),
  CONSTRAINT fk_lead_field_layout_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lead_field_layout_section FOREIGN KEY (section_id) REFERENCES lead_field_sections(id),
  CONSTRAINT fk_lead_field_layout_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_lead_field_layout_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — two brand-new, empty tables. No column on
-- `leads`, `lead_custom_fields`, or `lead_custom_field_values` is touched.
--
-- ROLLBACK SQL:
-- DROP TABLE lead_field_layout;
-- DROP TABLE lead_field_sections;
--
-- VERIFICATION SQL:
-- SHOW TABLES LIKE 'lead_field_sections'; SHOW TABLES LIKE 'lead_field_layout';
-- SHOW CREATE TABLE lead_field_sections; SHOW CREATE TABLE lead_field_layout;
-- ============================================================================
