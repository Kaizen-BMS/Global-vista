-- GVE (company id 9) is about to be the parent of multiple school
-- companies and shouldn't be limited by its own old trial plan while
-- running them. Checked live before writing this: GVE's one existing
-- subscription row (id 3) is still on plan 1 ("30 Days Trial",
-- max_users=5, max_storage_mb=250, status='trial') — a real cap, not
-- just cosmetic.
--
-- This is a pure data change, not a code change: plan 13 ("Concierge")
-- already exists with every limit column NULL (max_users, max_leads,
-- max_storage_mb all NULL) — this app's own established convention
-- everywhere (enforceUserLimit, enforceLeadLimit, storage checks) is
-- "NULL means unlimited," so pointing GVE's subscription at this
-- existing plan and marking it active/non-expiring makes it unlimited
-- using the exact same billing mechanics every other company already
-- runs on — nothing new, nothing company-9-specific in the code at all.
--
-- Only company 9's own row is touched. No other company's subscription,
-- plan, or data is affected.

UPDATE company_subscriptions
SET plan_id = 13, status = 'active', ends_at = NULL
WHERE id = 3 AND company_id = 9;
