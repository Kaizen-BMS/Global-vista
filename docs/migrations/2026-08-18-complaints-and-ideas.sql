-- ============================================================================
-- Migration: Complaints/Escalations + Ideas/Suggestions
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-08-18 immediately before writing this
-- — confirmed no complaints/ideas/comment tables exist anywhere, and no
-- 'complaint%'/'idea%' permission slugs exist in `permissions`.
--
-- Deliberately NOT gated by new `permissions`/`role_permissions` rows —
-- every active employee can raise their own complaint/idea (no elevated
-- permission needed, same pattern as Notifications/Messages/Profile nav
-- items, which have permission:null in navItems.js); only the Super Admin
-- elevation is checked in code via isSuperAdmin(session), same pattern the
-- Messaging module already uses for its broadcast channel. This avoids a
-- second kind of change (seeding new permission rows) beyond the schema
-- itself.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COMPLAINTS
-- ----------------------------------------------------------------------------
CREATE TABLE complaints (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  description TEXT NOT NULL,
  desired_resolution VARCHAR(500) NULL DEFAULT NULL,
  priority ENUM('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium',
  status ENUM('Open','Under Review','In Progress','Waiting for Employee','Resolved','Closed') NOT NULL DEFAULT 'Open',
  related_lead_id INT(10) UNSIGNED NULL DEFAULT NULL,
  related_employee_id INT(10) UNSIGNED NULL DEFAULT NULL,
  assigned_reviewer_id INT(10) UNSIGNED NULL DEFAULT NULL,
  attachment_key VARCHAR(500) NULL DEFAULT NULL,
  attachment_name VARCHAR(255) NULL DEFAULT NULL,
  created_by INT(10) UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_complaints_company (company_id),
  KEY idx_complaints_created_by (created_by),
  KEY idx_complaints_status (status),
  CONSTRAINT fk_complaints_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_complaints_lead FOREIGN KEY (related_lead_id) REFERENCES leads(id),
  CONSTRAINT fk_complaints_related_employee FOREIGN KEY (related_employee_id) REFERENCES users(id),
  CONSTRAINT fk_complaints_reviewer FOREIGN KEY (assigned_reviewer_id) REFERENCES users(id),
  CONSTRAINT fk_complaints_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE complaint_comments (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id INT(10) UNSIGNED NOT NULL,
  company_id INT(10) UNSIGNED NOT NULL,
  author_id INT(10) UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  is_internal TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_complaint_comments_complaint (complaint_id),
  CONSTRAINT fk_complaint_comments_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_complaint_comments_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_complaint_comments_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------------------------------------------------------
-- 2. IDEAS / SUGGESTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE ideas (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  description TEXT NOT NULL,
  priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  status ENUM('Submitted','Under Review','Planned','In Progress','Implemented','Rejected') NOT NULL DEFAULT 'Submitted',
  visibility ENUM('private','company') NOT NULL DEFAULT 'private',
  rejection_reason VARCHAR(500) NULL DEFAULT NULL,
  attachment_key VARCHAR(500) NULL DEFAULT NULL,
  attachment_name VARCHAR(255) NULL DEFAULT NULL,
  assigned_to INT(10) UNSIGNED NULL DEFAULT NULL,
  created_by INT(10) UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ideas_company (company_id),
  KEY idx_ideas_created_by (created_by),
  KEY idx_ideas_status (status),
  CONSTRAINT fk_ideas_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_ideas_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id),
  CONSTRAINT fk_ideas_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE idea_comments (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  idea_id INT(10) UNSIGNED NOT NULL,
  company_id INT(10) UNSIGNED NOT NULL,
  author_id INT(10) UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_idea_comments_idea (idea_id),
  CONSTRAINT fk_idea_comments_idea FOREIGN KEY (idea_id) REFERENCES ideas(id),
  CONSTRAINT fk_idea_comments_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_idea_comments_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — four brand-new, empty tables.
--
-- ROLLBACK SQL:
-- DROP TABLE idea_comments;
-- DROP TABLE ideas;
-- DROP TABLE complaint_comments;
-- DROP TABLE complaints;
--
-- VERIFICATION SQL:
-- SHOW TABLES LIKE 'complaints'; SHOW TABLES LIKE 'complaint_comments';
-- SHOW TABLES LIKE 'ideas'; SHOW TABLES LIKE 'idea_comments';
-- SHOW CREATE TABLE complaints; SHOW CREATE TABLE ideas;
-- ============================================================================
