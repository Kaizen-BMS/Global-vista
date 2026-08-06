# Global Vista — Architecture & State-of-the-Repo Report

Generated from a full read-through of the repository (no code changed). MySQL + `mysql2/promise` (no ORM), Next.js 16 App Router, JWT session auth. The repo is **mid-migration**: for almost every subsystem there is a live implementation and one or two legacy/dead copies sitting next to it under similar names. Section 19–20 map out exactly which is which — read those before editing anything.

---

## 1. Complete Folder Structure

```
public/
  icons/ images/ videos/

src/
  animations/                      # motion/animation helpers for the marketing site
  app/
    (protected)/  (public)/        # DEAD route groups — no auth wiring, superseded by workspace/platform
    about/ services/ contact/      # public marketing pages
    api/
      activity-logs/               # legacy, duplicate of core/activity-logs
      auth/                        # legacy forgot-password, duplicate of core/auth
      contact/                     # public contact form → email
      core/
        activity-logs/ auth/{login,logout,logout-all,session,sessions,change-password,forgot-password,reset-password}/
        notifications/ organization/{[resource],academic-sessions,geography,lead-sources,services}/
        permissions/ rbac/roles/ roles/[id]/permissions/ search/ settings/[group]/
        system-health/ system/health/
        users/{[id],export,import,import-history}/
      leads/[id]/{assign,documents,followups,notes,tasks,timeline}/   # LIVE lead-management API
      modules/crm/{leads,settings}/  # partially-migrated CRM API (see §9/§20)
      platform/
        activity-logs/ companies/[id]/{modules,provision}/ operator-view/ search/ settings/[group]/ system-health/
      roles/[id]/permissions/  settings/[group]/  users/[id]/   # legacy duplicates of core/*
      storage/download/
      test-db/                     # ⚠ unauthenticated debug endpoint — see §21
    companies/[id]/                # platform-admin company view (legacy top-level path)
    crm/(protected)/                # DEAD legacy CRM app
    modules/crm/{dashboard,lead-management,settings}/   # intermediate CRM implementation
    platform/companies/[id]/       # LIVE platform-operator console
    workspace/
      activity-logs/ change-password/ dashboard/ documents/
      lead-management/{[id]/edit,new}/ notifications/ profile/
      roles/[id]/permissions/ settings/{academic-sessions,branding,email,geography,lead-sources,notifications,organization,services,system}/
      students/ users/[id]/        # LIVE tenant app
  components/
    cards/ common/ dialogs/ forms/ layout/ notifications/ profile/ roles/ sections/ shared/ ui/ users/
    core/{auth,notifications,profile,roles,users}/   # DEAD, mirrors components used by workspace
    crm/{auth,badges,cards,charts,layout,leads,shared,tables}/  # legacy CRM UI
    modules/crm/{badges,cards,charts,forms,leads}/   # intermediate CRM UI
    platform/{companies,layout}/    # LIVE platform-admin UI
  constants/ data/ hooks/ utils/
  lib/
    actions/                        # legacy data-access layer, still partly live (see §19/§20)
    core/{actions,auth,db,email,http,import,navigation,rbac,security}/  # DEAD — 0 importers except noted exceptions
    helpers/                        # LIVE cross-cutting: response.js, errors.js, validation.js, db.js, csrf.js/withCsrf.js, permissions.js, rateLimit.js, email.js, rls.js
    modules/crm/{actions,constants}/  # LIVE-ish CRM action layer (RLS-aware)
    platform/{actions,...}/         # LIVE: tenant.js, moduleRegistry.js, registerCrmModule.js
    services/                       # EventBus.js, AuditService.js, NotificationService.js, registerCoreSubscribers.js
    storage/                        # LocalProvider.js, S3Provider.js (stub), R2Provider.js (stub)
    activityLog.js  auth.js  db.js  notifications.js  permissions.js   # top-level singletons
middleware.js                       # root — JWT verification, platform/workspace segregation
next.config.mjs
```

---

## 2. Authentication Flow

- **Token**: JWT (jose, HS256, secret `CRM_JWT_SECRET`) issued by `src/lib/auth.js:17-24`, payload = `{ id, role_id, role_slug, is_super_admin, is_platform_operator, company_id, must_change_password, jti }`.
- **Storage**: httpOnly, `sameSite=lax` cookie `gv_crm_session` (`auth.js:9,28`).
- **Login**: `POST /api/core/auth/login` (`src/app/api/core/auth/login/route.js:9`) — IP rate-limited (10/15min), checks account lockout, bcrypt-verifies password (`verifyPassword`, `auth.js:15`), records login history + activity log, issues session cookie.
- **Enforcement happens twice**:
  1. **Edge**: root `middleware.js:7-35` verifies the JWT with `jose.jwtVerify`, requires `company_id` in the payload, redirects unauthenticated users to `/login`, segregates `/platform/*` vs `/workspace/*` by `is_platform_operator`, and injects `x-company-id`/`x-user-id` headers for downstream handlers.
  2. **Layout**: `workspace/layout.js` and `platform/layout.js` independently call a DB-backed `getSession()` and `redirect()` — not just trusting the middleware.
- **Revocation**: sessions are tracked in `user_sessions` keyed by `jti`; logout/logout-all revoke by row (`auth.js:32-41`). `getSession` re-checks the DB row is still valid (`auth.js:42-55`), so a stolen-but-revoked JWT is rejected even before expiry.
- **Password reset**: `forgot-password` → `reset-password` flow, email sent via `sendPasswordResetEmail` (see §12).
- **Forced password change**: `must_change_password` flag in the JWT is checked in `workspace/layout.js` to force a change-password form before anything else renders.
- Public/unauthenticated paths: `login`, `forgot-password`, `reset-password` only.

---

## 3. Authorization (RBAC)

- **Model**: action-level, per-permission-slug (e.g. `"roles.manage"`), resolved via `permissions → role_permissions → roles` in `src/lib/helpers/permissions.js` — this is the **live** file; `src/lib/permissions.js` is a near-identical dead stub with a single legacy importer (`api/activity-logs/route.js`).
- **`can(session, slug)`** (`permissions.js:18-27`):
  1. Looks up the permission's `module_slug`.
  2. Unless the module is `"platform"`/`"core"`, checks the tenant's subscription state and `isModuleEnabledForCompany` — **RBAC is fused with module licensing**: a role can grant a permission and it's still denied if the tenant hasn't licensed that module.
  3. `is_super_admin` bypasses role checks entirely.
  4. `is_platform_operator` is a separate flag, checked via `assertPlatformOperator` for platform-only routes.
- **Roles are per-tenant** with global system-role templates (`company_id IS NULL`) cloned into each new tenant at provisioning time (`src/lib/actions/roles.js:6-13,31`).
- **UI**: `src/components/roles/PermissionMatrix.js` edits a role's permission set; persisted via `PUT /api/roles/[id]/permissions` (and its `core/rbac/roles` duplicate).
- No row-level "field masking" — permission checks are all-or-nothing per action, except leads, which additionally apply row-level visibility filtering (see §9).

---

## 4. Platform Architecture

The platform layer is the operator/super-admin console sitting above all tenants.

- **Entry**: `src/app/platform/layout.js` — DB-backed session check, redirects non-operators; hardcoded nav (not the `Sidebar`/`Topbar` components used by workspace).
- **Dashboard**: `src/app/platform/page.js` — `listCompanies()` + `getActivityLogs({module:"platform"})`, computes total-users/enabled-module counts by reducing over the companies array client-side; three raw stat divs, no chart library, no componentized cards.
- **Company management**: `src/app/platform/companies/[id]/` + `src/app/api/platform/companies/[id]/route.js` (view/edit a tenant), `.../modules/route.js` (toggle module licensing via `setCompanyModule()`), `.../provision/route.js` (create a new tenant, see §11).
- **Module registry**: `src/lib/platform/moduleRegistry.js` — an in-process `Map`, populated at import time by files like `registerCrmModule.js` calling `registerModule({slug, navItems, searchProvider, dashboardWidgets})`. This is synchronous, in-memory, and process-local — it has to be imported somewhere for its side effect to run (currently only pulled in via `api/platform/search/route.js`).
- **Tenant lookups**: `src/lib/platform/tenant.js` — `getEnabledModuleSlugs`, `isModuleEnabledForCompany`, `getSubscriptionState`, `getCurrentCompany`, all keyed by `companyId`.
- Platform identity is **not** a separate user table — it's the same `users` table with `is_platform_operator=1` plus a `company_id` (platform operators still belong to a home company row).

---

## 5. Workspace Architecture

The workspace is the tenant-scoped shell every non-operator user lands in.

- **Entry**: `src/app/workspace/layout.js:11-14` — `getSession()`, redirect if absent; redirects platform operators to `/platform`; loads `getVisibleNavItems(session)` and `getCurrentCompany(session.company_id)` from `src/lib/platform/tenant.js`; renders shared `Sidebar`/`Topbar` (DB-driven nav + company branding); intercepts rendering to force the password-change form when `must_change_password` is set.
- **Pages**: `dashboard`, `lead-management` (+ `[id]/edit`, `new`), `users`, `roles` (+ `[id]/permissions`), `settings/*` (branding, email, geography, organization, system, academic-sessions, lead-sources, services, notifications), `students`, `documents`, `activity-logs`, `notifications`, `profile`, `change-password`.
- `students` exists as a route but has no corresponding module registration or API route found elsewhere in the survey — worth checking directly if you touch it (possibly a stub/placeholder page).
- This is the tree that **supersedes** `src/app/crm/*` and `src/app/modules/crm/*` for the same lead-management functionality (see §19).

---

## 6. CRM Architecture

Three overlapping implementations of "CRM" exist simultaneously:

| Generation | Pages | API | Actions | Notes |
|---|---|---|---|---|
| Legacy | `src/app/crm/(protected)/` | — | `src/lib/actions/leads.js` | Oldest, `session.company_id` filtering only, kept alive only as a marketing/legacy landing page (`src/app/crm/page.js`) whose CTAs point to `/login` |
| Intermediate | `src/app/modules/crm/*` | `src/app/api/modules/crm/leads/route.js` | **still imports the old `@/lib/actions/leads`**, not the new RLS-aware module | Cutover incomplete — see §20 |
| Live | `src/app/workspace/lead-management/*` | `src/app/api/leads/*` | `src/lib/modules/crm/actions/leads.js` (row-level-security via `getVisibleLeadFilter`) | The one to treat as canonical |

- **Entities**: `leads` (lead_number, lead_source_id, service_id, assigned_to, stage, priority, duplicate-detection fields) with `lead_notes`, `lead_tasks`, `lead_followups`, `lead_documents`, `lead_assignment_history` as 1—N children, joined to `lead_sources`/`services` lookup tables.
- **UI**: `src/components/crm/leads/*` (legacy) vs `src/components/modules/crm/leads/*` (intermediate) — LeadsTable, LeadTabs, LeadTimeline, LeadNotes, LeadTasks, LeadFollowups, LeadDocuments, plus dashboard widgets (`RecentLeadsCard`, `TodaysFollowupsCard`, `LeadSourceChart`, `ServiceChart`).
- `src/app/companies/*` is **not** a CRM "company" entity — it's the platform-admin tenant-company view; the CRM module has no separate company/contact object beyond a lead.

---

## 7. Database Architecture

*Updated against a full `mysqldump` of the live database (MariaDB 11.8.8) supplied directly — this section is now confirmed schema, not inference. No migration files exist in the repo; this dump is the closest thing to a canonical schema and is worth keeping as a reference (see note at the end of this section).*

- **Driver**: `mysql2/promise`, no ORM, no query builder (`src/lib/db.js:2`). Parameterized `pool.query(sql, params)` everywhere.
- **Pool**: `mysql.createPool()` (`connectionLimit: 10`, `waitForConnections: true`, keep-alive, 10s connect timeout, `idleTimeout: 30000` — explicitly to dodge Hostinger's server-side `wait_timeout`), cached on `globalThis.__gvPool` outside production to survive Next.js dev HMR (`db.js:4-25`). `"server-only"` guards against client bundling.
- **Schema**: still entirely implicit from the app's point of view — **no `schema.prisma`, no Mongoose models, no `.sql` files tracked in the repo, no migrations folder.** The dump confirms **42 tables**, all `InnoDB` / `utf8mb4`, with real foreign keys and a soft-delete (`is_deleted`/`deleted_at`/`deleted_by`) convention on most master-data tables.
- **Retracted claim**: §22 previously said there was "no visible indexing strategy" — that was wrong. The live schema has **extensive indexing**: every tenant-scoped table has an `idx_*_company` key on `company_id`, every FK column has a supporting index, and hot lookup paths are covered (`idx_leads_phone`, `idx_leads_email`, `idx_leads_status`, `idx_notifications_user` as a composite `(user_id, is_read)`, etc.).

### Table groups (42 total)

| Group | Tables |
|---|---|
| Tenant/platform core | `companies`, `company_domains`, `company_modules`, `company_settings`, `company_subscriptions`, `company_provisioning_log`, `company_user_history`, `modules`, `plans`, `plan_modules`, `platform_settings`, `platform_events`, `subscription_history` |
| Identity/auth | `users`, `user_sessions`, `user_login_history`, `password_history`, `user_import_history` |
| RBAC | `roles`, `permissions`, `role_permissions` |
| Org/HR | `branches`, `departments`, `designations`, `employee_types`, `employee_documents`, `academic_sessions` |
| Geography | `countries`, `states`, `cities` |
| CRM/leads | `leads`, `lead_sources`, `lead_notes`, `lead_tasks`, `lead_followups`, `lead_documents`, `lead_assignment_history` |
| Tenant-scoped settings | `crm_settings` |
| Logging | `activity_logs`, `email_logs`, `notifications` |

### Key relationships (as enforced by real FK constraints in the dump)

- `companies` 1—N `users`, `branches`, `departments`, `company_modules`, `company_subscriptions`, `company_domains`, `roles` (nullable `company_id` for global system-role templates), `lead_sources`, `services`, `crm_settings`, `leads`.
- `users` N—1 `roles`, N—1 `branches`/`departments`/`designations`/`employee_types` (all `ON DELETE SET NULL`), self-referencing N—1 `reporting_manager_id → users.id`.
- `roles` N—N `permissions` via `role_permissions` (`ON DELETE CASCADE` both directions); `roles.company_id` nullable + a `uk_company_role_slug (company_id, slug)` unique key is exactly how system-role templates (`company_id IS NULL`) coexist with per-tenant roles of the same slug.
- `leads` N—1 `lead_sources`, `services`, `users` (`assigned_to`), self-referencing N—1 `duplicate_of → leads.id`; 1—N `lead_notes`/`lead_tasks`/`lead_followups`/`lead_documents`/`lead_assignment_history` (all `ON DELETE CASCADE` from the lead).
- `company_modules` is the join between `companies` and `modules` (`uniq_company_module (company_id, module_id)`), and `plan_modules` joins `plans` to `modules` — i.e. entitlement is theoretically two-layered (what the plan includes vs. what's actually toggled on for the company) but only `company_modules` is read at runtime per §9/§4.
- `notifications`, `activity_logs`, `email_logs` all carry `user_id`/`company_id` FKs with `ON DELETE CASCADE`/`SET NULL` as appropriate — genuinely well-modeled as append-only tenant-scoped logs.

### Confirmed from the live data (not just schema) — worth flagging

- **`modules` has 13 catalog rows** (CRM, Student ERP, HRMS, Hospital, Finance, Inventory, Projects, Marketing, Website, Helpdesk, Document Management, Reports, Analytics) but **`company_modules` has exactly 1 row** — only CRM is actually enabled for the one tenant that exists. The other 12 are a product roadmap sitting in the catalog table with zero corresponding app code (confirms §17 — those modules don't exist beyond a DB row and an icon name).
- **`plans` has one row** ("Starter", trial, `max_users=25`) and `max_storage_mb`/`max_api_calls_per_day` are both `NULL` — the plan-limits columns exist but aren't populated/enforced anywhere seen in the code survey.
- **Only the Super Admin role has any `role_permissions` rows** (35 of them). The other 8 seeded roles (Admin, Study Counsellor, B2B Counsellor, Summer School Counsellor, CERN Counsellor, Accounts, Marketing, Management) exist with zero permissions assigned. If this reflects the actual deployed state rather than fresh seed data mid-setup, **every non-super-admin user is currently unable to do anything** — worth confirming with whoever owns this tenant's data before assuming it's just incomplete test setup.
- **There is no `students` table anywhere in the schema** — this confirms §17: the `src/app/workspace/students` route has no backing entity at all. It cannot be reading or writing real data.
- **`notifications`, `platform_events`, `company_domains`, `company_settings`, `subscription_history`, `company_user_history` all have zero rows** in the dump — consistent with §13/§18's finding that notifications and platform events are wired but never actually triggered, and confirms `company_domains`/`subscription_history`/`company_user_history` are provisioned schema with no live feature behind them yet.
- **Three separate settings tables** — `company_settings` (generic, empty), `crm_settings` (14 rows, CRM/branding/email/system keys — the one actually populated and used), `platform_settings` (4 rows, platform-level) — confirms §24's "settings duplicated across code paths" finding at the schema level too: three key-value stores for what is conceptually one concern.
- `crm_settings` already has `smtp_host`/`smtp_port`/`smtp_user`/`smtp_secure`/`smtp_from_name`/`smtp_reply_to` keys seeded (all empty) — suggesting **per-tenant custom SMTP was planned** but the actual email code (§12) is hardcoded to a single Gmail account, not reading these settings. That's a real gap between schema intent and implementation.

### Tenant scoping — refined

FKs on `company_id` (e.g. `fk_leads_company`, `fk_users_company`) guarantee **referential integrity** (a row can't reference a non-existent company) but do **not** provide row-level isolation — nothing in MySQL stops a query that omits `WHERE company_id = ?` from reading another tenant's rows via a valid-but-wrong `company_id`, or from omitting the filter entirely. The §21 finding stands: isolation is still an app-layer convention, just now confirmed to be sitting on top of a schema that was clearly designed with tenancy in mind (the indexes and FKs are there) — the gap is purely in query-authoring discipline, not schema design.

### No migrations tooling — refined

Confirmed no migration tool in `package.json`. **Recommendation**: since a full authoritative dump now exists, consider committing a stripped version (schema/DDL only — `mysqldump --no-data`, with no rows, no password hashes, no tokens) into the repo (e.g. `db/schema.sql`) as a checked-in reference, and adopt a migration tool (even a lightweight one like `node-pg-migrate`-equivalent for MySQL, or plain numbered `.sql` files applied manually) going forward. **Do not commit the dump you just shared as-is** — it contains live bcrypt password hashes, password-reset tokens, and real user email addresses.

---

## 8. API Architecture

- **90 `route.js` files** under `src/app/api/`, roughly half of which are **live-duplicate pairs** of a `core/`-prefixed and a top-level path (e.g. `api/roles` vs `api/core/roles` vs `api/core/rbac/roles` — three routes doing the same thing).
- **Common composition pattern** (the live convention): `withErrorHandling(withCsrf(handler))`, permission check via `can(session, slug)`, and standardized envelopes from `src/lib/helpers/response.js` (`ok/created/fail/forbidden/unauthorized/notFound/badRequest`). Errors are typed (`AppError`/`ForbiddenError`/`NotFoundError`/`ValidationError` in `errors.js`) and mapped centrally, including MySQL `ER_DUP_ENTRY`.
- **CSRF**: `withCsrf()` wraps mutating handlers (skips GET/HEAD/OPTIONS), verified via `verifyCsrf()`. Currently used in **60 of 90** route files — the remaining 30 are worth auditing individually (some may legitimately be GET-only, but this wasn't confirmed file-by-file).
- **Business logic lives in `src/lib/actions/*` / `src/lib/modules/*/actions/*`**, not in route handlers — these are plain async server-only functions (not `"use server"` Server Actions), imported directly by both route handlers and server components. Route files stay thin: session → permission check → validation → call action → format response.
- **Rate limiting** (`src/lib/helpers/rateLimit.js`) is only confirmed wired into login — not verified elsewhere (e.g. forgot-password, which is a common abuse target).
- **Storage**: `GET /api/storage/download` verifies an HMAC-SHA256 signed, time-limited token and cross-checks the tenant ID embedded in the object key against `session.company_id` before serving a file — solid tenant isolation for downloads specifically.
- **`GET /api/test-db`**: unauthenticated health-check that leaks the DB name and raw driver error text. See §21.

---

## 9. Multi-Tenancy Architecture

- A tenant = a row in `companies`. Every session/JWT carries `company_id`; `middleware.js` and every list/read query key off it.
- **Isolation boundary is manual**, not structural: no row-level security in MySQL, no automatic query-scoping layer — correctness depends on every query author remembering `WHERE company_id = ?`.
- **One partial exception**: the live CRM lead actions (`src/lib/modules/crm/actions/leads.js`) use `getVisibleLeadFilter` (`src/lib/helpers/rls.js`) for an extra layer of row-level visibility on top of `company_id` (e.g. assignment-based visibility). This pattern exists in exactly one place — it has not been generalized into a reusable primitive for other entities.
- **Platform vs tenant segregation** is a boolean (`is_platform_operator`) plus route-prefix convention (`/platform/*` vs `/workspace/*`), enforced in both `middleware.js` and each area's `layout.js`.
- **Module licensing per tenant**: `company_modules(company_id, module_id, enabled, licensed, expires_at)` — a module is usable only if `enabled=1 AND licensed=1` and unexpired; combined with `company_subscriptions` state (active/expired/cancelled/no_subscription) inside `can()` to gate every non-core permission.

---

## 10. Dashboard Architecture

Both dashboards are **fully wired to real data** — no hardcoded/placeholder values found.

- **Workspace dashboard** (`src/app/workspace/dashboard/page.js`): `getDashboardStats(session)` (`src/lib/actions/dashboard.js:4-8`) runs three live `COUNT` queries (active users, roles, locked accounts) plus `getActivityLogs({limit:8, companyId})`. Rendered via `StatCard`, `RecentActivityCard`, `QuickActionsCard` (`src/components/cards/*`). No chart library used here despite `recharts` being a dependency.
- **Platform dashboard** (`src/app/platform/page.js`): `listCompanies()` + `getActivityLogs({module:"platform", limit:8})`; total-users and enabled-module counts are derived client-side by reducing over the companies array; cards are inline JSX, not componentized; no charts.
- `recharts` is a dependency and is used for the CRM-specific charts (`LeadSourceChart`, `ServiceChart` in `src/components/crm/charts` / `src/components/modules/crm/charts`), not on the top-level dashboards.

---

## 11. Provisioning Flow

`provisionCompany()` (`src/lib/platform/actions/provisioning.js:124-560`), invoked from `POST /api/platform/companies/[id]/provision`, runs as **one atomic DB transaction**:

1. Validate admin email uniqueness.
2. Create the `companies` row with a unique slug.
3. Clone system role templates (`company_id IS NULL`) and their `role_permissions` into the new tenant.
4. Create a default branch and department (company-scoped unique codes).
5. Seed default `lead_sources` (Website/Referral/Walk-In) and `services`.
6. Seed `crm_settings` (site_name, timezone).
7. Create the tenant's super-admin user with a temporary password.
8. Enable the requested `moduleIds` in `company_modules`.
9. Assign a trial row in `company_subscriptions`.
10. Commit.
11. **Outside** the transaction (deliberately, lines ~500-553): flush a provisioning log to `company_provisioning_log`, write an activity-log entry, send the welcome email.

This is the one place in the codebase where DDL-adjacent seeding is scripted — there's still no DDL/migration tooling, only data seeding for new tenants.

---

## 12. Email Flow

Real SMTP transport exists — **not a stub**, but there are two near-duplicate implementations:

- `src/lib/helpers/email.js:6-40` — **the one actually used everywhere**: `nodemailer.createTransport` hardcoded to `smtp.gmail.com:465`, auth from `EMAIL_USER`/`EMAIL_PASS`. Exposes `sendWelcomeEmail`, `sendPasswordResetEmail`. Every send is logged to an `email_logs` table (`logEmail()`, status/response/message-id).
- `src/lib/core/email/email.js:8-126` — a more elaborate version (verifies transporter, retries once on failure) that is **entirely unused** — dead code, no importers found.
- Callers: `sendWelcomeEmail` from `src/lib/actions/users.js`, `src/lib/platform/actions/provisioning.js` (welcome email), `src/lib/core/actions/users.js`, `src/lib/core/actions/userImport.js`. `sendPasswordResetEmail` from `api/auth/forgot-password` and its `api/core/auth/forgot-password` duplicate.
- A **separate, unrelated** ad-hoc mailer exists in `src/app/api/contact/route.js` (public contact form) with its own Gmail SMTP setup and the only two `console.log` calls in `src/`.
- **No retry logic** in the version that's actually used (only the dead copy has it). **No `.env.example`** documents `EMAIL_USER`/`EMAIL_PASS`/`NEXT_PUBLIC_APP_URL` — undiscoverable except by reading source.
- Gmail SMTP with app-password auth is not a production-grade transactional email setup (deliverability/rate limits) — worth flagging if this is meant for real tenant onboarding volume.

---

## 13. Notification Flow

This is one of the more incomplete subsystems.

- `src/lib/services/NotificationService.js` is a channel registry (`notify(channel, params)`) with only `in_app` (insert into `notifications`) and `webhook` (plain `fetch` POST) actually functional. `email`/`sms`/`whatsapp`/`push`/`slack`/`teams`/`discord` all `throw new Error(...)` — real stubs. Notably, the `email` channel does **not** reuse `helpers/email.js` — the notification system and the email system are entirely disconnected.
- **`NotificationService.notify()` has zero call sites in the app outside its own file.** Nothing currently triggers a notification automatically from business events.
- `src/lib/services/EventBus.js` persists every emitted event to `platform_events`, and `registerCoreSubscribers.js` wires a `"*"` wildcard subscriber that is a **documented no-op** (the underlying Map-based `subscribe()` doesn't support real wildcards) — explicitly left as future work.
- **Three parallel "read notifications" implementations** exist: `src/lib/notifications.js` (unused), `src/lib/actions/notifications.js` (the one actually wired to `GET /api/core/notifications`), and the API route itself. Only one is live.
- **Frontend**: `NotificationBell.js` polls `/api/core/notifications` every 30 seconds (`setInterval`) — no websocket/SSE, pure polling.
- **Net effect**: since nothing calls `createNotification`/`notify()` from any real business action, the `notifications` table has no populated write path in normal operation — the UI is wired to display notifications that nothing currently generates.

---

## 14. Activity Logging

- `src/lib/activityLog.js` — `logActivity({user_id, module, action, entity_type, entity_id, description, meta, ip_address, company_id})` writes to `activity_logs`; `getActivityLogs()` reads it back joined with `users`, filterable by module/company/limit.
- Called directly from most mutating actions across the live layers (leads, documents, users, roles, provisioning) — this is the most consistently-used cross-cutting concern in the codebase.
- `src/lib/services/AuditService.js` is a thin re-export of the same two functions — exists as an alternate import path, not a different implementation.
- `activity_logs` is also what both dashboards (`§10`) render as the "recent activity" feed, and what `api/*/activity-logs` routes expose per module/company.

---

## 15. File/Document System

- **Storage layer** is provider-abstracted (`src/lib/storage/{LocalProvider,S3Provider,R2Provider}.js`, common interface `upload/delete/getSignedUrl/exists`). Only `LocalProvider` is implemented; `S3Provider`/`R2Provider` both throw "not configured" on every method — **cloud storage is not usable yet**, only local disk.
- `LocalProvider` writes outside `/public` to `STORAGE_ROOT` (`LOCAL_STORAGE_PATH` env) with a path-traversal guard (`assertSafeKey`). Downloads are never served by raw path — `getSignedUrl()` returns `/api/storage/download?key=&expires=&token=` with an HMAC-SHA256 token; the download route does a timing-safe signature check, expiry check, **and** cross-checks the `companies/{id}/` segment embedded in the key against `session.company_id` — genuinely solid tenant isolation for file access.
- **Documents are duplicated per feature, not a generic entity**: `lead_documents` (via `src/lib/modules/crm/actions/leadDocuments.js` and a near-duplicate `src/lib/actions/leadDocuments.js`) and `employee_documents` (via `src/lib/core/actions/employeeDocuments.js` / `src/lib/actions/employeeDocuments.js`) are separate tables with identical shape (`type, file_name, file_url, file_size, uploaded_by`) — copy-pasted rather than shared.
- **Upload validation is thin**: the document-attach routes (`api/leads/[id]/documents`, `api/core/users/[id]/documents`) only check that `type`/`fileName`/`fileUrl` are non-empty — **no file-type allowlist or size-limit enforcement visible at that layer.**

---

## 16. Current Implemented Features

- JWT auth with revocable sessions, rate-limited login, account lockout, forced password change, password reset via email.
- Action-level RBAC fused with per-tenant module licensing.
- Multi-tenant provisioning (atomic, seeds roles/branches/departments/lookups/settings/subscription).
- Platform-admin console: tenant list, tenant detail/edit, module enable/disable per tenant, activity log, system health.
- Workspace (tenant) app: dashboard, lead management (CRUD, assignment, notes, tasks, followups, documents, timeline), users, roles+permission matrix, settings (branding/email/geography/organization/academic-sessions/lead-sources/services/system/notifications), activity log, profile, change password.
- CSV user import/export pipeline (`core/users/export`, `/import`, `/import-history`).
- Local file storage with signed, tenant-checked download URLs.
- Real transactional email (welcome + password reset) via Gmail SMTP, logged to `email_logs`.
- Global search (platform-level and per-module search providers via `moduleRegistry`).
- Activity logging across nearly all mutating actions.

---

## 17. Missing Features

- **Cloud storage** (S3/R2) — interfaces exist, implementations don't; only local disk works.
- **Real notification delivery** — no channel except `in_app`/`webhook` works, and nothing in the app actually calls `notify()`, so even `in_app` notifications aren't populated by real events.
- **Real-time updates** anywhere — notifications, dashboards, activity feeds are all poll/refresh-on-load, no websocket/SSE.
- **Migrations/schema tooling** — no way to evolve the DB schema through the repo; it's all tribal knowledge + manual SQL.
- **Automated tests** — no `*.test.*`/`*.spec.*` files anywhere in `src/`; `package.json` has no `test` script.
- **`.env.example`** — required env vars (`CRM_JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `LOCAL_STORAGE_PATH`, DB vars, `NEXT_PUBLIC_APP_URL`) are undocumented.
- Generic/reusable "documents" entity (currently duplicated per feature — see §15).
- `students` route exists under `workspace/` with no corresponding module registration, API, or database table at all — **confirmed via the live schema dump: there is no `students` table anywhere in the 42-table schema.** This route cannot be backed by real data as it stands.
- 12 of the 13 catalog rows in `modules` (Student ERP, HRMS, Hospital, Finance, Inventory, Projects, Marketing, Website, Helpdesk, Document Management, Reports, Analytics) have zero application code — they exist only as a database row and an icon name in the module catalog.
- Per-tenant custom SMTP — `crm_settings` has the columns seeded for it (`smtp_host`/`smtp_port`/etc.) but the email sender ignores them and is hardcoded to one Gmail account (§12).

---

## 18. Broken / Incomplete Features

- **`api/modules/crm/leads/route.js`** still imports the old, non-RLS `@/lib/actions/leads` instead of the tenant-safe `@/lib/modules/crm/actions/leads` — this route bypasses the row-level-security filter the "live" lead actions otherwise enforce.
- **Notification system is wired but functionally dead** — UI polls and renders a `notifications` table that nothing populates (see §13).
- **EventBus wildcard subscriber is a documented no-op** — anything expecting `"*"` subscriptions to fire is silently broken.
- **Security headers scoped to the wrong routes** — `next.config.mjs`'s `headers()` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) only apply to `/crm/:path*`, the legacy tree, not `/workspace` or `/platform`, which are the actual live surface.
- **`GET /api/test-db`** — unauthenticated, leaks DB name + raw error text; looks like a debug leftover.
- **Only the Super Admin role has any permissions in the live database** — the `role_permissions` table has 35 rows, all for `role_id=1` (Super Admin). The other 8 seeded roles (Admin, Study Counsellor, B2B Counsellor, Summer School Counsellor, CERN Counsellor, Accounts, Marketing, Management) have zero. If any real (non-super-admin) user is currently active against this data, they can do nothing — confirm with whoever owns the tenant whether this is expected mid-setup state or an actual gap in the provisioning/role-assignment flow.

---

## 19. Dead Code

Confirmed zero-importer or functionally superseded:

- `src/lib/core/**` (actions, auth, db, email, http, import, navigation, rbac, security) — structurally mirrors the live `src/lib/actions`/`helpers`/`platform` trees but is not imported anywhere except a couple of stray legacy route files noted in §20.
- `src/app/(protected)/` and `src/app/(public)/` route groups — no auth wiring in their layouts; fully superseded by `workspace/`/`platform/`.
- `src/app/crm/(protected)/` — old CRM app; only `src/app/crm/page.js` (a marketing-style landing page whose CTAs point to `/login`) is still reachable.
- `src/components/core/**` — stale duplicates of components used by `workspace/`, several still importing from the legacy `@/components/crm/shared/apiClient` path (confirmed not wired into any live page).
- `src/lib/core/email/email.js` — more capable (retry-aware) email sender that nothing imports; `src/lib/helpers/email.js` is used instead.
- `src/lib/notifications.js` — unused; `src/lib/actions/notifications.js` is the one actually wired to the API.
- `src/components/layout/WebsiteLayout.jsx` — alternate public-site layout not referenced by `LayoutWrapper` (which uses `Navbar`, not this file's `Header`).

**Recommendation**: before doing any refactor in the "actions", "auth", or "notifications" areas, grep for importers first — the dead trees are structurally convincing enough to edit by accident.

---

## 20. Duplicate Code

Three-way or two-way duplication is the dominant pattern in this repo, not the exception:

- **CRM**: `src/app/crm/*` / `src/app/modules/crm/*` / `src/app/workspace/lead-management/*` — three UIs; `src/lib/actions/leads.js` / `src/lib/modules/crm/actions/leads.js` — two action layers, only one RLS-aware.
- **API routes**: `api/roles` ≈ `api/core/roles` ≈ `api/core/rbac/roles`; `api/settings/[group]` ≈ `api/core/settings/[group]` ≈ `api/platform/settings/[group]`; `api/users` ≈ `api/core/users`; `api/activity-logs` ≈ `api/core/activity-logs` ≈ `api/platform/activity-logs`; `api/auth/forgot-password` ≈ `api/core/auth/forgot-password`; `api/core/system-health` ≈ `api/core/system/health`.
- **Documents**: `lead_documents` vs `employee_documents` — identical shape, copy-pasted actions/routes (§15).
- **Notifications**: `src/lib/notifications.js` vs `src/lib/actions/notifications.js` vs the logic embedded in the API route — three read implementations for the same table (§13).
- **Email**: `src/lib/helpers/email.js` vs `src/lib/core/email/email.js` (§12).
- **`src/lib/permissions.js`** vs `src/lib/helpers/permissions.js` — one live, one near-identical stub with a single legacy caller.

**Consolidation risk**: because these pairs are *structurally* similar but not always *behaviorally* identical (e.g. the RLS gap in §18, the retry-logic gap in §12), a naive "just delete the duplicate" pass could silently drop a feature. Diff before deleting.

---

## 21. Security Issues

Ranked roughly by severity:

1. **`GET /api/test-db`** — no auth, leaks DB name and raw SQL driver error text to anyone. Remove or gate before production.
2. **No enforced tenant-scoping mechanism** — `company_id` filtering is 100% convention-based across dozens of hand-written queries; one missed `WHERE` clause in any duplicate/legacy path is a cross-tenant data leak. The RLS pattern in `helpers/rls.js` proves the team knows how to do this properly but hasn't generalized it.
3. **Security headers (`X-Frame-Options` etc.) don't cover `/workspace` or `/platform`** — the config only matches `/crm/:path*`, so the live app currently ships without them.
4. **CSRF coverage gap** — 60 of 90 API route files use `withCsrf()`; the other 30 weren't individually verified as GET-only, so this needs a route-by-route audit.
5. **Rate limiting confirmed only on login** — `forgot-password` and other unauthenticated/abuse-prone endpoints weren't confirmed to be rate-limited.
6. **Gmail SMTP with app-password auth** for transactional email (welcome/password-reset) — fragile for volume and a credential-management concern; not a scoped API-key-based provider.
7. **No `.env.example`** — increases the chance of a misconfigured/missing secret in a new environment going unnoticed (e.g. `CRM_JWT_SECRET` falling back to something weak, if it does — verify the fallback behavior directly before assuming it's safe).
8. **Document upload routes accept `fileUrl` from the client with only a non-empty check** — no server-side file-type allowlist or size cap visible at that layer; worth confirming the actual upload path enforces this upstream.

---

## 22. Performance Issues

- **Connection pool `connectionLimit: 10`** is a modest ceiling for a multi-tenant app under real concurrent load — worth revisiting once traffic patterns are known.
- **No caching layer** anywhere observed (no Redis, no in-memory cache, no `unstable_cache`/`use cache` usage found) — every dashboard/list load is a fresh DB round-trip.
- **Notification polling** every 30s per connected client (`NotificationBell.js`) — cheap per-user, but scales linearly with concurrent users hitting a DB-backed endpoint with no cache.
- ~~No visible query indexing strategy~~ — **retracted after reviewing the live schema dump**: indexing is actually solid. Every tenant-scoped table has a `company_id` index, every FK has a supporting key, and hot lookup columns (`leads.phone`, `leads.email`, `leads.status`, `notifications.(user_id, is_read)`) are explicitly indexed. No performance concern here.
- **Platform dashboard computes aggregates by reducing over `listCompanies()` in JS** rather than doing it in SQL — fine at current scale, would need to move server-side as tenant count grows.
- **`leads.lead_number` is a plain `UNIQUE` key with no visible sequence/counter table** — under concurrent lead creation across multiple requests, whatever code generates the next `GV-YYYY-NNNNNN` value needs to handle the race (e.g. via `SELECT ... FOR UPDATE` or a dedicated counter row) or duplicate-key errors will surface under load; worth confirming the generation logic in `src/lib/modules/crm/actions/leads.js` handles this.

---

## 23. UI Inconsistencies

- **Three distinct layout shells** (platform hardcoded-nav, workspace `Sidebar`/`Topbar`, public `Navbar`/`Footer`+galaxy background) plus a fourth unused `WebsiteLayout.jsx` — no shared design-system primitives visibly enforced between them.
- **Duplicate component trees** (`components/core` vs `components/crm` vs `components/modules/crm`) mean the "same" feature can render with visually drifted styling depending on which generation of the page is hit.
- Styling is ad hoc Tailwind utility classes directly in JSX with no shared token/theme layer beyond the dark palette convention (`neutral-900`/`neutral-800`/`indigo-400`) — consistent in spirit, not enforced by any lint rule or shared component.
- `StatCard.js` (workspace) and a differently-implemented `StatCard.jsx` (marketing) share a name but are unrelated components — a source of confusion for anyone searching by filename.

---

## 24. Database Inconsistencies

- **No canonical schema definition tracked in the repo** — a live dump exists (see §7) but nothing under version control; any two developers' mental model of the schema can silently drift until that's fixed.
- **Duplicate entity shapes** (`lead_documents` vs `employee_documents`) that should arguably be one polymorphic `documents` table — confirmed identical column shape in the real schema (`type`, `file_name`, `file_url`, `file_size`, `uploaded_by`, `created_at`), just pointed at different parent FKs (`lead_id` vs `user_id`).
- **Three separate settings tables at the schema level**, not just duplicate code paths: `company_settings` (generic, currently empty), `crm_settings` (14 populated rows — the one actually used), `platform_settings` (4 rows). All three have the same `key`/`value`/`group` shape. This is schema-level duplication, not just an application-layer one.
- **`crm_settings` has SMTP-configuration keys** (`smtp_host`, `smtp_port`, `smtp_user`, `smtp_secure`, `smtp_from_name`, `smtp_reply_to`) that are seeded but never read — the actual email sender (§12) is hardcoded to a single Gmail account, not per-tenant SMTP. Schema and implementation have diverged.
- **Two-layer module entitlement (`plan_modules` + `company_modules`) that collapses to one in practice** — the schema supports "plan includes module X" separately from "company has module X enabled," but only `company_modules` is read at runtime (§4/§9); `plan_modules` currently has no observed code path reading it.
- **`activity_logs`, `platform_events`, and `email_logs`** are three separate append-only log tables with overlapping purpose (auditability) and no unified query surface — reasonable as a design choice, but not documented as intentional anywhere in the code, and `platform_events` currently has zero rows despite `EventBus.js` existing to populate it (see §13/§18).
- **13 rows in `modules` vs. 1 row in `company_modules`** — the module catalog describes a 13-module product (CRM, Student ERP, HRMS, Hospital, Finance, Inventory, Projects, Marketing, Website, Helpdesk, Documents, Reports, Analytics) but only CRM has any corresponding application code at all. The other 12 are schema/catalog aspiration with nothing behind them — treat any mention of those modules elsewhere (nav, marketing copy) as forward-looking, not implemented.

---

## 25. Technical Debt

- The single biggest debt item is **the unfinished three-way migration** itself (legacy → intermediate "modules" → live workspace/platform) — until the legacy and intermediate trees are deleted, every future change risks being made in the wrong copy.
- **No migrations tooling** and **no tests** are both foundational gaps that make the debt above riskier to pay down safely — there's no automated way to verify a consolidation pass didn't break anything.
- **Manual tenant-scoping convention** (§21.2) is debt disguised as a working pattern — it works today because it's been done carefully, but nothing prevents regression.
- **Notification system** is fully-built plumbing (service, table, UI, polling) with no actual producer wired in — either finish wiring it to real events or explicitly mark it out of scope; right now it looks finished but isn't.
- **Duplicate API routes** (§20) roughly double the surface area that needs security/behavior review for every future audit.

---

## 26. Current Project Completion — Estimate

This is a judgment call based on what's wired end-to-end vs. stubbed/duplicated/dead, not a precise metric (no ticket tracker or spec was available to check against).

| Area | Rough completeness | Basis |
|---|---|---|
| Auth & sessions | ~90% | Fully wired, revocable, rate-limited, tested-looking flows; missing only `.env.example`/docs |
| RBAC & module licensing | ~85% | Solid, consistently enforced; UI (PermissionMatrix) present |
| Multi-tenant provisioning | ~85% | Atomic, thorough seeding; no rollback/edit-provisioning flow observed |
| Workspace CRM (leads) | ~70% | Feature-complete UI/API, but split across 3 generations and one route bypasses RLS |
| Platform admin console | ~65% | Core tenant/module management works; dashboards are minimal, no billing/plan management UI observed |
| File storage | ~40% | Local-only; S3/R2 unimplemented; upload validation thin |
| Notifications | ~25% | Full plumbing built, zero real producers wired — effectively non-functional in practice |
| Email | ~60% | Real transport works for 2 templates; no retry in the live path, Gmail SMTP not production-grade |
| Testing/QA infra | ~0% | No test files, no test script |
| Schema/migrations tooling | ~0% | Entirely implicit, manual |
| Code hygiene (dead/duplicate code cleanup) | ~30% | Large volume of parallel implementations still present |

**Overall: roughly 55–65% toward a production-ready state.** The core tenant/auth/RBAC/CRM spine is genuinely solid and mostly complete; what's pulling the average down is (a) an unfinished internal migration leaving 2-3x the code surface that needs to exist, (b) a notification system that's built but not connected to anything, (c) no storage redundancy beyond local disk, and (d) zero automated testing or schema tooling to safely execute the cleanup this report identifies.
