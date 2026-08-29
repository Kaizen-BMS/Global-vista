-- ============================================================================
-- Migration: Secure, tokenized payment-request links (for WhatsApp/sharing)
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-08-27 — no existing table named
-- payment_requests.
--
-- WHY this is needed: the "Collect via UPI" feature previously built the
-- QR/link straight from /api/core/payments/upi-qr — a SESSION-GATED route,
-- and the amount was a plain query-string parameter. That made the link
-- useless to actually send to a lead (they aren't logged into the CRM, so
-- the QR image 401s for them) and, separately, not tamper-resistant (an
-- amount in a query string can be edited by anyone who has the link).
--
-- This table makes each "collect payment" action mint one specific,
-- unguessable, single-purpose request: a fixed amount, tied to a company
-- (and optionally a lead), looked up by `token` alone — a public page and a
-- public QR-image route both resolve ONLY from this row, never from a
-- client-supplied amount. Existing UPI settings (crm_settings) are
-- untouched; this is purely additive.
-- ============================================================================

CREATE TABLE payment_requests (
  id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL,
  lead_id INT(10) UNSIGNED NULL DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  note VARCHAR(200) NULL DEFAULT NULL,
  token VARCHAR(64) NOT NULL,
  created_by INT(10) UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_requests_token (token),
  KEY idx_payment_requests_company (company_id),
  KEY idx_payment_requests_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ROLLBACK (only if you need to undo this migration)
-- ============================================================================
-- DROP TABLE IF EXISTS payment_requests;
