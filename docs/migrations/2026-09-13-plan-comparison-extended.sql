-- Extends the plans table so the homepage's "Compare every plan" table
-- can be replaced by the company's own comparison spreadsheet, fully
-- dynamically: two more admin-editable text labels (Maintenance cost,
-- Payment method — same free-text pattern as the existing Registration/
-- Dev cost/Install cost labels already on this table), plus a generic
-- feature_flags list so an operator can add/remove/rename any ✓/✗
-- comparison row per plan from the Platform Admin's Plan editor, with NO
-- further code change needed the next time this list changes. Stored as
-- TEXT with JSON.stringify/JSON.parse in application code — the same
-- convention already used for saved-filter params in
-- src/lib/modules/crm/actions/savedFilters.js — rather than a native
-- MySQL JSON column, for consistency with the rest of this codebase.

ALTER TABLE plans
  ADD COLUMN maintenance_cost_label VARCHAR(60) NULL AFTER installation_cost_label,
  ADD COLUMN payment_method_label VARCHAR(60) NULL AFTER maintenance_cost_label,
  ADD COLUMN feature_flags TEXT NULL AFTER payment_method_label;

-- Data to match the spreadsheet exactly, checked against what's live
-- today. Two of these are REAL business-configuration changes, not just
-- new columns being filled in for the first time — flagging both here so
-- they aren't missed:
--   • Professional's Registration is currently "Self" — the spreadsheet
--     says "Assisted". This changes what real customers see on the
--     pricing page for that plan.
--   • Essential currently ALLOWS lead import/export (allow_import_export=1)
--     — the spreadsheet marks it "x" (not included). This is a real
--     feature-gate change for every company already on Essential, not
--     just a display change.
-- Everything else already matched what's live (Development/Installation
-- cost, Max users, Leads, Storage, Price, Billing model) and needed no
-- correction.

UPDATE plans SET registration_label = 'Assisted' WHERE id = 15 AND name = 'Professional';
UPDATE plans SET allow_import_export = 0 WHERE id = 14 AND name = 'Essential';

UPDATE plans SET maintenance_cost_label = 'Free' WHERE id IN (1, 13, 14, 15);

UPDATE plans SET payment_method_label = 'x' WHERE id = 1 AND name = '30 Days Trial';
UPDATE plans SET payment_method_label = 'Annual' WHERE id IN (14, 15) AND name IN ('Essential', 'Professional');
UPDATE plans SET payment_method_label = 'Flexible' WHERE id = 13 AND name = 'Concierge';

-- The six new feature rows are exclusively Concierge in the spreadsheet —
-- everyone else is "x" across the board, so an empty/NULL feature_flags
-- list (application code already treats a missing label as "x") covers
-- Trial/Essential/Professional with no row needed here at all.
UPDATE plans SET feature_flags = '[
  {"label":"AI Analytic Reports","included":true},
  {"label":"Customized User Interface","included":true},
  {"label":"Customized API Integration","included":true},
  {"label":"Dedicated Account Manager","included":true},
  {"label":"24/7 Phone Support","included":true},
  {"label":"24/7 Training Support","included":true}
]' WHERE id = 13 AND name = 'Concierge';
