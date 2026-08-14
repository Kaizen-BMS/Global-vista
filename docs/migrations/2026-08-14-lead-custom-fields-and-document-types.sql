-- ============================================================================
-- Migration: Lead Custom Fields + Lead Document Types
-- Database:  u111637957_gv_crm  (Hostinger phpMyAdmin — the only DB this app uses)
-- Verified against LIVE schema on 2026-08-14 immediately before writing this:
--   companies.id       = int(10) unsigned  (PK)
--   users.id           = int(10) unsigned  (PK)
--   leads.id           = int(10) unsigned  (PK)
--   lead_documents.id  = bigint(20) unsigned (PK), company_id/lead_id = int(10) unsigned,
--                        type = ENUM(...) NOT NULL, NO document_type_id column yet
--   Table collation in use by companies/users/leads/lead_documents: utf8mb4_uca1400_ai_ci
--   Existing "company-scoped managed list" convention (lead_sources, services,
--   employee_document_types): id/company_id/created_by/updated_by all
--   int(10) unsigned, status ENUM('active','inactive'), is_deleted tinyint(1),
--   deleted_at timestamp NULL, deleted_by int(10) unsigned NULL.
-- This script follows those exact types/conventions — no guessing.
--
-- Confirmed via information_schema just before writing this script:
--   lead_custom_fields          -> does NOT exist
--   lead_custom_field_values    -> does NOT exist
--   lead_document_types         -> does NOT exist
--   lead_documents.document_type_id -> does NOT exist
--
-- Run the four statements below, in order, in phpMyAdmin's SQL tab against
-- u111637957_gv_crm. Nothing here touches or deletes any existing row.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LEAD DOCUMENT TYPES
-- Per-company configurable document categories for lead uploads.
-- ----------------------------------------------------------------------------
CREATE TABLE lead_document_types (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL DEFAULT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
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
  KEY idx_lead_document_types_company (company_id),
  KEY idx_lead_document_types_deleted (is_deleted),
  CONSTRAINT fk_lead_document_types_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lead_document_types_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_lead_document_types_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------------------------------------------------------
-- 2. lead_documents.document_type_id
-- Additive only. `type` (the existing ENUM) is left exactly as-is — every
-- existing row and every existing query against it keeps working unchanged.
-- New uploads made through a configured document type also stamp this
-- column; NULL on all existing rows and on any upload made without a
-- configured type.
-- ----------------------------------------------------------------------------
ALTER TABLE lead_documents
  ADD COLUMN document_type_id INT(10) UNSIGNED NULL DEFAULT NULL AFTER type;

ALTER TABLE lead_documents
  ADD CONSTRAINT fk_lead_documents_type FOREIGN KEY (document_type_id) REFERENCES lead_document_types(id);

ALTER TABLE lead_documents
  ADD KEY idx_lead_documents_type (document_type_id);

-- ----------------------------------------------------------------------------
-- 3. LEAD CUSTOM FIELDS
-- Field DEFINITIONS only — one row per custom field a company has
-- configured. Deliberately NOT columns on `leads`: adding a field must
-- never require another migration, and this design supports hundreds of
-- fields per company with zero further schema changes.
-- ----------------------------------------------------------------------------
CREATE TABLE lead_custom_fields (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  section VARCHAR(100) NOT NULL DEFAULT 'Custom Information',
  field_key VARCHAR(100) NOT NULL,
  label VARCHAR(200) NOT NULL,
  help_text VARCHAR(500) NULL DEFAULT NULL,
  placeholder VARCHAR(200) NULL DEFAULT NULL,
  default_value VARCHAR(500) NULL DEFAULT NULL,
  field_type ENUM('text','textarea','number','date','datetime','select','radio','checkbox','multiselect','country','state','city','address','url','email','phone','file') NOT NULL DEFAULT 'text',
  options_json TEXT NULL DEFAULT NULL,
  show_on_lead_form TINYINT(1) NOT NULL DEFAULT 1,
  show_on_lead_detail TINYINT(1) NOT NULL DEFAULT 1,
  show_on_query_form TINYINT(1) NOT NULL DEFAULT 0,
  is_required_on_lead_form TINYINT(1) NOT NULL DEFAULT 0,
  is_required_on_query_form TINYINT(1) NOT NULL DEFAULT 0,
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
  UNIQUE KEY uk_lead_custom_fields_key (company_id, field_key),
  KEY idx_lead_custom_fields_company (company_id),
  KEY idx_lead_custom_fields_deleted (is_deleted),
  CONSTRAINT fk_lead_custom_fields_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lead_custom_fields_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_lead_custom_fields_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------------------------------------------------------
-- 4. LEAD CUSTOM FIELD VALUES
-- One row per (lead, custom field). `id` is BIGINT UNSIGNED, matching the
-- existing convention for high-row-count per-lead child tables
-- (lead_documents.id is also BIGINT UNSIGNED for the same reason).
-- ----------------------------------------------------------------------------
CREATE TABLE lead_custom_field_values (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  lead_id INT(10) UNSIGNED NOT NULL,
  custom_field_id INT(10) UNSIGNED NOT NULL,
  value TEXT NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_lead_custom_field_value (lead_id, custom_field_id),
  KEY idx_lcfv_company (company_id),
  KEY idx_lcfv_field (custom_field_id),
  CONSTRAINT fk_lcfv_lead FOREIGN KEY (lead_id) REFERENCES leads(id),
  CONSTRAINT fk_lcfv_field FOREIGN KEY (custom_field_id) REFERENCES lead_custom_fields(id),
  CONSTRAINT fk_lcfv_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


-- ============================================================================
-- WHAT EACH TABLE / COLUMN DOES
-- ============================================================================
-- lead_document_types
--   One row = one document category a company can require from leads
--   (e.g. "Passport", "Offer Letter"). name/description shown in the upload
--   UI; is_required flags it as mandatory (UI-level, not DB-enforced);
--   display_order controls the order the upload dropdown shows them in;
--   status='inactive' hides it from new uploads without deleting it;
--   is_deleted is the real soft-delete flag, same pattern as lead_sources/
--   services/employee_document_types already use.
--
-- lead_documents.document_type_id
--   Nullable FK to lead_document_types.id. NULL means "uploaded before a
--   type was chosen, or the company hasn't configured typed documents yet."
--   The existing `type` ENUM column is untouched and keeps working exactly
--   as it does today for every existing row and every existing query.
--
-- lead_custom_fields
--   One row = one custom field a company has defined. `section` groups
--   fields into named groups (free text, not a separate table — a new
--   section name just appears, ordered by its fields' display_order).
--   `field_key` is a stable slug (e.g. "visa_interview_date") used
--   internally; `label`/`help_text`/`placeholder`/`default_value` are all
--   admin-editable display text. `field_type` picks the input widget;
--   `options_json` holds the option list for select/radio/multiselect as a
--   JSON array. The three `show_on_*` + two `is_required_on_*` flags are
--   independent booleans so a field can appear on Add Lead without being
--   on the public Query Form, or vice versa, with its own required rule in
--   each place. `display_order` orders fields within a section.
--
-- lead_custom_field_values
--   One row per (lead, field) holding that lead's answer as text. This is
--   the part that lets a company add its 500th custom field without any
--   further migration — a new field is just a new row in
--   lead_custom_fields; existing leads simply have no row here for it
--   until answered.
--
-- ============================================================================
-- EXISTING DATA AFFECTED
-- ============================================================================
-- NONE deleted, renamed, or overwritten.
--   - lead_document_types, lead_custom_fields, lead_custom_field_values are
--     brand-new, empty tables.
--   - The only change to an existing table is the new nullable
--     document_type_id column added to lead_documents — every existing row
--     gets NULL there and is otherwise untouched; the existing `type`
--     column, all existing file_url/file_name/file_size/uploaded_by data,
--     and every existing query against lead_documents keep working exactly
--     as before.
--
-- ============================================================================
-- ROLLBACK SQL (run in this exact order if you ever need to undo this)
-- ============================================================================
-- DROP TABLE lead_custom_field_values;
-- ALTER TABLE lead_documents DROP FOREIGN KEY fk_lead_documents_type;
-- ALTER TABLE lead_documents DROP KEY idx_lead_documents_type;
-- ALTER TABLE lead_documents DROP COLUMN document_type_id;
-- DROP TABLE lead_custom_fields;
-- DROP TABLE lead_document_types;
--
-- ============================================================================
-- VERIFICATION SQL (run after the migration to confirm it actually applied)
-- ============================================================================
-- SHOW TABLES LIKE 'lead_document_types';
-- SHOW TABLES LIKE 'lead_custom_fields';
-- SHOW TABLES LIKE 'lead_custom_field_values';
-- SHOW COLUMNS FROM lead_documents LIKE 'document_type_id';
-- SHOW CREATE TABLE lead_document_types;
-- SHOW CREATE TABLE lead_custom_fields;
-- SHOW CREATE TABLE lead_custom_field_values;
-- SELECT COUNT(*) FROM lead_document_types;      -- expect 0
-- SELECT COUNT(*) FROM lead_custom_fields;        -- expect 0
-- SELECT COUNT(*) FROM lead_custom_field_values;  -- expect 0
-- SELECT COUNT(*) FROM lead_documents;            -- expect the SAME count as before running this
