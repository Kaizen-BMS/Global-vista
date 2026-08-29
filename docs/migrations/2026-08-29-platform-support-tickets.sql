-- ============================================================================
-- Migration: Platform Support Tickets
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- Gives a company (Super Admin only, same elevation check as the broadcast
-- messaging channel and the existing Complaints module) a way to escalate a
-- concern directly to the Platform Operator — a channel that did not exist
-- before. This is intentionally its own table, not a reuse of `complaints`
-- (that table and its queries are strictly company-scoped by design; this
-- one is the one deliberate cross-tenant read in the app, and keeping it
-- structurally separate keeps that carve-out contained to one place).
-- ============================================================================

CREATE TABLE platform_support_tickets (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  subject VARCHAR(200) NOT NULL,
  category ENUM('Billing','Technical','Feature Request','Account','Other') NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL,
  priority ENUM('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium',
  status ENUM('Open','In Progress','Waiting for Company','Resolved','Closed') NOT NULL DEFAULT 'Open',
  attachment_key VARCHAR(500) NULL DEFAULT NULL,
  attachment_name VARCHAR(255) NULL DEFAULT NULL,
  created_by INT(10) UNSIGNED NOT NULL,
  assigned_operator_id INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_pst_company (company_id),
  KEY idx_pst_status (status),
  CONSTRAINT fk_pst_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_pst_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_pst_operator FOREIGN KEY (assigned_operator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE platform_support_ticket_comments (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id INT(10) UNSIGNED NOT NULL,
  author_id INT(10) UNSIGNED NOT NULL,
  is_operator TINYINT(1) NOT NULL DEFAULT 0,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pstc_ticket (ticket_id),
  CONSTRAINT fk_pstc_ticket FOREIGN KEY (ticket_id) REFERENCES platform_support_tickets(id),
  CONSTRAINT fk_pstc_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — two brand-new, empty tables.
--
-- ROLLBACK SQL:
-- DROP TABLE platform_support_ticket_comments;
-- DROP TABLE platform_support_tickets;
--
-- VERIFICATION SQL:
-- SHOW TABLES LIKE 'platform_support_tickets'; SHOW TABLES LIKE 'platform_support_ticket_comments';
-- ============================================================================
