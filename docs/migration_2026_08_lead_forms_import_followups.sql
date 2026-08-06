-- =====================================================================
-- Global Vista — Migration: Lead Import History, Public Lead Forms,
-- Follow-up type/disposition extensions
-- Approved 2026-08-07. Run as one script. Additive only — no existing
-- table, column, index, or row is modified or dropped.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Lead Import History
-- ---------------------------------------------------------------------
CREATE TABLE lead_import_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  total_rows INT UNSIGNED NOT NULL DEFAULT 0,
  imported_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_count INT UNSIGNED NOT NULL DEFAULT 0,
  skipped_count INT UNSIGNED NOT NULL DEFAULT 0,
  failed_count INT UNSIGNED NOT NULL DEFAULT 0,
  duplicate_count INT UNSIGNED NOT NULL DEFAULT 0,
  duplicate_strategy ENUM('skip','update','import_anyway') NOT NULL DEFAULT 'skip',
  column_mapping LONGTEXT NULL,
  error_report LONGTEXT NULL,
  imported_by INT UNSIGNED NULL,
  duration_ms INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_import_history_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lead_import_history_user FOREIGN KEY (imported_by) REFERENCES users(id),
  INDEX idx_lead_import_history_company (company_id),
  INDEX idx_lead_import_history_created (created_at)
);

-- ---------------------------------------------------------------------
-- 2) Public Lead Forms
-- ---------------------------------------------------------------------
CREATE TABLE lead_forms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  fields_config LONGTEXT NOT NULL,
  default_lead_source_id INT UNSIGNED NULL,
  default_service_id INT UNSIGNED NULL,
  default_assigned_to INT UNSIGNED NULL,
  default_tags VARCHAR(255) NULL,
  campaign VARCHAR(150) NULL,
  success_message VARCHAR(500) NULL,
  redirect_url VARCHAR(500) NULL,
  notify_emails VARCHAR(500) NULL,
  theme_config LONGTEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  recaptcha_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_lead_forms_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lead_forms_source FOREIGN KEY (default_lead_source_id) REFERENCES lead_sources(id),
  CONSTRAINT fk_lead_forms_service FOREIGN KEY (default_service_id) REFERENCES services(id),
  CONSTRAINT fk_lead_forms_assignee FOREIGN KEY (default_assigned_to) REFERENCES users(id),
  UNIQUE KEY uk_lead_forms_slug (slug),
  INDEX idx_lead_forms_company (company_id),
  INDEX idx_lead_forms_is_deleted (is_deleted)
);

CREATE TABLE lead_form_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  form_id INT UNSIGNED NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  lead_id INT UNSIGNED NULL,
  raw_data LONGTEXT NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  device VARCHAR(50) NULL,
  browser VARCHAR(50) NULL,
  country VARCHAR(100) NULL,
  referrer_url VARCHAR(500) NULL,
  utm_source VARCHAR(150) NULL,
  utm_medium VARCHAR(150) NULL,
  utm_campaign VARCHAR(150) NULL,
  utm_term VARCHAR(150) NULL,
  utm_content VARCHAR(150) NULL,
  status ENUM('success','failed','spam') NOT NULL DEFAULT 'success',
  failure_reason VARCHAR(255) NULL,
  completion_ms INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_form_submissions_form FOREIGN KEY (form_id) REFERENCES lead_forms(id),
  CONSTRAINT fk_form_submissions_lead FOREIGN KEY (lead_id) REFERENCES leads(id),
  CONSTRAINT fk_form_submissions_company FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_form_submissions_form (form_id),
  INDEX idx_form_submissions_company (company_id),
  INDEX idx_form_submissions_created (created_at)
);

CREATE TABLE lead_form_views (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  form_id INT UNSIGNED NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  source ENUM('link','qr') NOT NULL DEFAULT 'link',
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  device VARCHAR(50) NULL,
  browser VARCHAR(50) NULL,
  country VARCHAR(100) NULL,
  referrer_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_form_views_form FOREIGN KEY (form_id) REFERENCES lead_forms(id),
  CONSTRAINT fk_form_views_company FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_form_views_form (form_id),
  INDEX idx_form_views_created (created_at)
);

-- ---------------------------------------------------------------------
-- 3) Follow-up type widening (SMS, Custom) + structured extras
-- ---------------------------------------------------------------------
ALTER TABLE lead_followups
  MODIFY COLUMN type ENUM('Phone Call','WhatsApp','Meeting','Zoom','Email','Reminder','SMS','Custom') NOT NULL;

ALTER TABLE lead_followups
  ADD COLUMN duration_seconds INT UNSIGNED NULL AFTER outcome,
  ADD COLUMN disposition ENUM('Interested','Not Interested','No Response','Follow-up Needed') NULL AFTER duration_seconds;

-- =====================================================================
-- ROLLBACK (run in reverse order if needed)
-- =====================================================================
-- ALTER TABLE lead_followups DROP COLUMN duration_seconds, DROP COLUMN disposition;
-- ALTER TABLE lead_followups MODIFY COLUMN type ENUM('Phone Call','WhatsApp','Meeting','Zoom','Email','Reminder') NOT NULL; -- fails if any row already uses SMS/Custom
-- DROP TABLE lead_form_views;
-- DROP TABLE lead_form_submissions;
-- DROP TABLE lead_forms;
-- DROP TABLE lead_import_history;
