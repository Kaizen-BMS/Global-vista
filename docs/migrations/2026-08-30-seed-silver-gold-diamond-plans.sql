-- ============================================================================
-- Seed data: Silver / Gold / Diamond plans, matching the pricing sheet.
-- Verified against the LIVE `plans` schema on 2026-08-30 (the tiered-plans
-- migration has already run — pricing_model, maintenance_annual_fee, the
-- three label columns, and allow_import_export all exist).
--
-- These are real, seat-based (pricing_model='per_user') plans: `price` is
-- charged PER ACTIVE EMPLOYEE per month, and `maintenance_annual_fee` bills
-- separately, once a year, alongside it. Both are just starting values —
-- edit them anytime from Platform Console → Modules → Plans; every field
-- (including the Registration/Development/Installation labels) is
-- editable there and updates everywhere the plan is shown — the pricing
-- page, the plan picker, the registration flow — the moment you save.
--
-- "Trial" is deliberately NOT included here — this company's Starter plan
-- (id=1, trial_days=5) already serves that role; add a second trial tier
-- yourself via the Plans UI if you want the sheet's exact 30-day/4-user/
-- 250MB version instead.
-- ============================================================================

INSERT INTO plans
  (name, slug, description, billing_cycle, pricing_model, price, maintenance_annual_fee, currency,
   registration_label, development_cost_label, installation_cost_label,
   trial_days, max_users, max_leads, max_storage_mb, allow_import_export, status)
VALUES
  ('Silver', 'silver', 'Great for small, growing teams.', 'monthly', 'per_user', 399.00, 999.00, 'INR',
   'Self', 'Free', 'Free',
   NULL, NULL, NULL, 250, 1, 'active'),

  ('Gold', 'gold', 'More storage, lower annual maintenance.', 'monthly', 'per_user', 550.00, 499.00, 'INR',
   'Self', 'Free', 'Free',
   NULL, NULL, NULL, 1024, 1, 'active'),

  ('Diamond', 'diamond', 'No annual maintenance fee, unlimited storage.', 'monthly', 'per_user', 599.00, NULL, 'INR',
   'Self', 'Free', 'Free',
   NULL, NULL, NULL, NULL, 1, 'active');

-- ============================================================================
-- EXISTING DATA AFFECTED: none — three brand-new rows, nothing updated or
-- removed. Your existing "Starter" and "testing pack for razorpay" plans
-- are untouched.
--
-- NEXT STEP (not run automatically): once these exist, go to Platform
-- Console → Modules → Plans and click "Sync to Razorpay" on each one — that
-- creates the real Razorpay Plan objects (one for the per-user price, one
-- for the maintenance fee) before any company can actually subscribe.
--
-- ROLLBACK SQL (only if nobody has subscribed to them yet):
-- DELETE FROM plans WHERE slug IN ('silver','gold','diamond');
--
-- VERIFICATION SQL:
-- SELECT id, name, pricing_model, price, maintenance_annual_fee, max_storage_mb FROM plans WHERE slug IN ('silver','gold','diamond');
-- ============================================================================
