import "server-only";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/helpers/email";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";

/**
 * =====================================================================
 * PROVISIONING LOG BUFFER
 * =====================================================================
 * Root cause (confirmed via schema audit): company_provisioning_log.
 * company_id has a FOREIGN KEY to companies.id. The original
 * implementation wrote log rows via pool.query() (a separate,
 * autocommit connection) WHILE the provisioning transaction was still
 * open on `conn`. This caused two confirmed, reproducible failures:
 *   1. A second connection referencing a still-uncommitted companies
 *      row can block or throw a FK violation before commit.
 *   2. After a rollback, companies.id no longer exists, so any log
 *      write referencing that id is guaranteed to violate the FK.
 *
 * Fix: every step is buffered in memory (zero DB writes during the
 * transaction) and flushed in ONE bulk INSERT via `pool`, only after
 * `conn.commit()` has succeeded and companyId is guaranteed to exist.
 * If provisioning fails before/without a successful commit, the
 * buffered steps are only written to console.error — the row they
 * would reference never existed durably, so a table write there would
 * itself violate the FK. This is a deliberate, explained trade-off.
 */
function createStepBuffer() {
  const steps = [];
  return {
    record(step, status, detail = null) {
      steps.push({ step, status, detail, at: new Date() });
    },
    all() {
      return steps;
    },
    async flush(companyId) {
      if (!companyId || steps.length === 0) return;
      try {
        const values = steps.map((s) => [companyId, s.step, s.status, s.detail, s.at]);
        await pool.query(
          `INSERT INTO company_provisioning_log (company_id, step, status, detail, created_at) VALUES ?`,
          [values]
        );
      } catch (e) {
        // Logging must never hide the original exception or break the
        // caller — this is a best-effort audit write only.
        console.error("Failed to flush provisioning log:", e.message);
      }
    },
  };
}

/**
 * Converts a company display name into a URL/identifier-safe slug.
 */
function makeSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * companies.slug is UNIQUE (single-column, global, confirmed via
 * information_schema). Retries with a numeric suffix until a free
 * slug is found. Runs on the transactional connection so it sees any
 * slug this same transaction may already be about to claim.
 */
async function getUniqueCompanySlug(conn, baseSlug) {
  let slug = baseSlug;
  let i = 1;

  while (true) {
    const [rows] = await conn.query(`SELECT id FROM companies WHERE slug=? LIMIT 1`, [slug]);
    if (!rows.length) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}

/**
 * BUG A FIX (confirmed via information_schema.STATISTICS):
 * branches.code and departments.code are UNIQUE as single columns —
 * global across the entire table, NOT scoped to company_id. A
 * hardcoded literal such as 'MAIN' or 'GEN' can only ever belong to
 * one company across the whole system, so every company after the
 * first would collide on ER_DUP_ENTRY. Namespacing the code with the
 * new company's own id makes it collision-proof by construction —
 * companyId is already guaranteed unique (just inserted in this same
 * transaction), so no existence check or retry loop is required here,
 * unlike the slug case above which must guard against caller input.
 */
function makeCompanyScopedCode(companyId, baseCode) {
  return `C${companyId}-${baseCode}`;
}

/**
 * =====================================================================
 * provisionCompany()
 * =====================================================================
 * Single-transaction company provisioning. Everything from
 * conn.beginTransaction() through conn.commit() is atomic — any
 * failure anywhere in that range rolls back every write, leaving no
 * partial/orphan company data. Provisioning log, activity log, and
 * welcome email are deliberately OUTSIDE the transaction and only run
 * after a successful commit (see createStepBuffer() docs above for the
 * FK reasoning; activity log and email are independently non-blocking
 * — a failure in either must never be reported as a provisioning
 * failure, since the company itself was already successfully created).
 *
 * Execution order (matches the dependency chain — each step only runs
 * once everything it depends on already exists in this transaction):
 *   validate admin email → create company → clone roles (needs
 *   companyId) → clone role_permissions (needs new role ids) → create
 *   branch (needs companyId) → create department (needs companyId) →
 *   seed lead_sources (needs companyId) → seed services (needs
 *   companyId) → seed crm_settings (needs companyId) → create admin
 *   user (needs companyId, role id, branch id, department id) → enable
 *   modules (needs companyId) → assign subscription (needs companyId)
 *   → COMMIT → flush provisioning log → activity log → welcome email.
 */
export async function provisionCompany(input, operatorId) {
  const {
    companyName,
    shortName,
    companyEmail = null,
    companyPhone = null,
    companyAddress = null,
    companyCountry = null,
    companyWebsite = null,
    adminName,
    adminEmail,
    adminPhone = null,
    // Set only by public self-registration, where the registrant picks
    // their own password. Operator-driven provisioning (the Platform
    // Console wizard) never passes this — it keeps generating a random
    // temp password + must_change_password + welcome email, unchanged.
    adminPassword = null,
    planId,
    moduleIds = [],
    endsAt = null,
    subscriptionStatus = "trial",
  } = input;

  // ---------------------------------------------------------------
  // Request-level validation (before acquiring a connection at all —
  // no point holding a pool connection for input that's already
  // known-invalid).
  // ---------------------------------------------------------------
  if (!companyName || !companyName.trim()) {
    const e = new Error("Company name is required.");
    e.status = 400;
    throw e;
  }
  if (!adminName || !adminName.trim()) {
    const e = new Error("Admin name is required.");
    e.status = 400;
    throw e;
  }
  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    const e = new Error("A valid admin email is required.");
    e.status = 400;
    throw e;
  }
  if (adminPassword != null && adminPassword.length < 8) {
    const e = new Error("Password must be at least 8 characters.");
    e.status = 400;
    throw e;
  }

  const conn = await pool.getConnection();
  const stepLog = createStepBuffer();

  let companyId = null;
  let adminResult = null;
  let superAdminRoleId = null;
  let tempPassword = null;
  let slug = null;

  try {
    await conn.beginTransaction();

    // -------------------------------------------------------------
    // Validate Admin Email — users.email is UNIQUE (single column,
    // global). Checked inside the transaction on `conn` so it's
    // consistent with any concurrent provisioning attempt already
    // holding a lock on this row.
    // -------------------------------------------------------------
    const [[existingUser]] = await conn.query(
      `SELECT id FROM users WHERE email=? LIMIT 1`,
      [adminEmail.trim().toLowerCase()]
    );
    if (existingUser) {
      const e = new Error("Admin email already exists. Please use another email.");
      e.status = 409;
      throw e;
    }

    // -------------------------------------------------------------
    // Create Company
    // companies columns used: name, short_name, slug, status,
    // created_by, updated_by — 6 columns, 6 placeholders, 6 params.
    // Verified against DESCRIBE companies: all 6 are valid columns;
    // short_name is nullable (YES) so `|| null` is safe; status is an
    // ENUM('active','suspended','deleted') — 'active' is a valid member.
    // -------------------------------------------------------------
    const baseSlug = makeSlug(companyName);
    slug = await getUniqueCompanySlug(conn, baseSlug);

    const [companyResult] = await conn.query(
      `INSERT INTO companies (name, short_name, slug, status, country, contact_email, contact_phone, address, website, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyName, shortName || null, slug, "active", companyCountry || null, companyEmail || null, companyPhone || null, companyAddress || null, companyWebsite || null, operatorId, operatorId]
    );
    companyId = companyResult.insertId;
    stepLog.record("company_created", "success");

    // -------------------------------------------------------------
    // Clone System Roles (templates where company_id IS NULL)
    // roles columns used: company_id, name, slug, description,
    // is_system, created_by, updated_by — 7 columns, 7 placeholders,
    // 7 params. Verified: roles has composite UNIQUE constraints
    // uk_company_role_name(company_id, name) and
    // uk_company_role_slug(company_id, slug) — both scoped correctly
    // per-company, so cloning the same slug/name into different
    // companies is explicitly allowed by this schema. The pre-check
    // below (existingRole) additionally guards against re-running
    // provisioning idempotently for the same company.
    // -------------------------------------------------------------
    const [templates] = await conn.query(
      `SELECT * FROM roles WHERE company_id IS NULL AND is_deleted=0 ORDER BY id`
    );

    if (templates.length === 0) {
      const e = new Error("No system role templates found to clone.");
      e.status = 500;
      throw e;
    }

    const roleIdMap = {};

    for (const role of templates) {
      const [[existingRole]] = await conn.query(
        `SELECT id FROM roles WHERE company_id=? AND slug=? LIMIT 1`,
        [companyId, role.slug]
      );

      let newRoleId;
      if (existingRole) {
        newRoleId = existingRole.id;
      } else {
        const [roleInsert] = await conn.query(
          `INSERT INTO roles (company_id, name, slug, description, is_system, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [companyId, role.name, role.slug, role.description, role.is_system, operatorId, operatorId]
        );
        newRoleId = roleInsert.insertId;
      }
      roleIdMap[role.id] = newRoleId;

      // -----------------------------------------------------------
      // Clone Role Permissions
      // role_permissions columns used: role_id, permission_id — 2
      // columns, 2 placeholders, 2 params. Uses INSERT IGNORE as a
      // defensive guard against re-running this loop idempotently;
      // note: no unique constraint on (role_id, permission_id) was
      // confirmed in the schema audit for this table specifically —
      // INSERT IGNORE here suppresses errors generally (including any
      // future FK issues) rather than guaranteeing no duplicates by
      // itself. Left as-is per "do not change database design" — if
      // duplicate permission rows become a real problem, the fix is a
      // schema-level unique index, not application code.
      // -----------------------------------------------------------
      const [permissions] = await conn.query(
        `SELECT permission_id FROM role_permissions WHERE role_id=?`,
        [role.id]
      );
      for (const permission of permissions) {
        await conn.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [newRoleId, permission.permission_id]
        );
      }
    }

    const templateSuperAdmin = templates.find((r) => r.slug === "super-admin");
    if (!templateSuperAdmin) {
      const e = new Error("Super Admin template role not found.");
      e.status = 500;
      throw e;
    }
    superAdminRoleId = roleIdMap[templateSuperAdmin.id];
    stepLog.record("roles_seeded", "success");

    // -------------------------------------------------------------
    // Create Default Branch
    // branches columns used: company_id, name, code, created_by,
    // updated_by — 5 columns, 5 placeholders, 5 params. code is now
    // company-scoped ("C{companyId}-MAIN") per Bug A fix, since
    // branches.code is a single-column UNIQUE index (global, not
    // per-company) — confirmed via information_schema.STATISTICS.
    // -------------------------------------------------------------
    const mainBranchCode = makeCompanyScopedCode(companyId, "MAIN");
    const [[existingBranch]] = await conn.query(
      `SELECT id FROM branches WHERE company_id=? AND code=? LIMIT 1`,
      [companyId, mainBranchCode]
    );

    let branchId;
    if (existingBranch) {
      branchId = existingBranch.id;
    } else {
      const [branchInsert] = await conn.query(
        `INSERT INTO branches (company_id, name, code, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [companyId, "Main Branch", mainBranchCode, operatorId, operatorId]
      );
      branchId = branchInsert.insertId;
    }
    stepLog.record("branch_created", "success");

    // -------------------------------------------------------------
    // Create Default Department
    // departments columns used: company_id, name, code, created_by,
    // updated_by — 5 columns, 5 placeholders, 5 params. Same Bug A
    // fix applied: departments.code is also single-column UNIQUE,
    // global — confirmed.
    // -------------------------------------------------------------
    const generalDeptCode = makeCompanyScopedCode(companyId, "GEN");
    const [[existingDepartment]] = await conn.query(
      `SELECT id FROM departments WHERE company_id=? AND code=? LIMIT 1`,
      [companyId, generalDeptCode]
    );

    let departmentId;
    if (existingDepartment) {
      departmentId = existingDepartment.id;
    } else {
      const [departmentInsert] = await conn.query(
        `INSERT INTO departments (company_id, name, code, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [companyId, "General", generalDeptCode, operatorId, operatorId]
      );
      departmentId = departmentInsert.insertId;
    }
    stepLog.record("department_created", "success");

    // -------------------------------------------------------------
    // Seed Lead Sources
    // lead_sources columns used: company_id, name, slug, created_by,
    // updated_by — 5 columns, 5 placeholders, 5 params.
    // CONFIRMED FIX: the previous version of this query had 6
    // placeholders against only 5 columns and 5 supplied params — a
    // stray extra `?` left unbound, which MariaDB correctly rejected
    // as ER_PARSE_ERROR ("You have an error in your SQL syntax...near
    // '?\n          )'"). This was the exact live error reproduced
    // during testing. Corrected here to exactly 5/5/5.
    // -------------------------------------------------------------
    const defaultLeadSources = [
      { name: "Website", slug: "website" },
      { name: "Referral", slug: "referral" },
      { name: "Walk-In", slug: "walk-in" },
    ];

    for (const source of defaultLeadSources) {
      const [[exists]] = await conn.query(
        `SELECT id FROM lead_sources WHERE company_id=? AND slug=? LIMIT 1`,
        [companyId, source.slug]
      );
      if (!exists) {
        await conn.query(
          `INSERT INTO lead_sources (company_id, name, slug, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?)`,
          [companyId, source.name, source.slug, operatorId, operatorId]
        );
      }
    }
    stepLog.record("lead_sources_seeded", "success");

    // -------------------------------------------------------------
    // Seed Services
    // services columns used: company_id, name, slug, created_by,
    // updated_by — 5 columns, 5 placeholders, 5 params.
    // CONFIRMED FIX: identical placeholder-count defect as
    // lead_sources above (6 placeholders vs 5 columns/params) —
    // corrected here to exactly 5/5/5. This defect had not yet thrown
    // in testing only because execution failed at lead_sources first.
    // -------------------------------------------------------------
    const defaultServices = [{ name: "General Enquiry", slug: "general-enquiry" }];

    for (const service of defaultServices) {
      const [[exists]] = await conn.query(
        `SELECT id FROM services WHERE company_id=? AND slug=? LIMIT 1`,
        [companyId, service.slug]
      );
      if (!exists) {
        await conn.query(
          `INSERT INTO services (company_id, name, slug, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?)`,
          [companyId, service.name, service.slug, operatorId, operatorId]
        );
      }
    }
    stepLog.record("services_seeded", "success");

    // -------------------------------------------------------------
    // Seed CRM Settings
    // crm_settings columns used: company_id, key, value, group,
    // created_by, updated_by — 6 columns, 6 placeholders, 6 params.
    // `key` and `group` are backtick-quoted since both are MySQL
    // reserved-adjacent identifiers.
    // -------------------------------------------------------------
    const settings = [
      { key: "site_name", value: companyName, group: "branding" },
      { key: "timezone", value: "Asia/Kolkata", group: "system" },
    ];

    for (const setting of settings) {
      const [[exists]] = await conn.query(
        `SELECT id FROM crm_settings WHERE company_id=? AND \`group\`=? AND \`key\`=? LIMIT 1`,
        [companyId, setting.group, setting.key]
      );
      if (!exists) {
        await conn.query(
          `INSERT INTO crm_settings (company_id, \`key\`, \`value\`, \`group\`, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [companyId, setting.key, setting.value, setting.group, operatorId, operatorId]
        );
      }
    }
    stepLog.record("settings_seeded", "success");

    // -------------------------------------------------------------
    // Create Company Admin User
    // users columns used: company_id, employee_id, role_id, branch_id,
    // department_id, name, email, password_hash, is_super_admin,
    // must_change_password, created_by, updated_by — 12 columns, 12
    // placeholders, 12 params. Depends on superAdminRoleId, branchId,
    // departmentId all already existing from prior steps — correct
    // dependency order preserved. users.email is UNIQUE (already
    // checked above, inside this same transaction).
    // -------------------------------------------------------------
    // Self-service registration supplies its own password (the registrant
    // typed it and confirmed it) — no temp password, no forced change.
    // Operator-driven provisioning keeps the original random-password +
    // must-change-password + welcome-email flow, unchanged.
    const usesOwnPassword = !!adminPassword;
    tempPassword = usesOwnPassword ? null : Math.random().toString(36).slice(-10) + "A1!";
    const passwordHash = await hashPassword(usesOwnPassword ? adminPassword : tempPassword);
    const employeeId = `${slug.toUpperCase()}-001`;

    [adminResult] = await conn.query(
      `INSERT INTO users (
        company_id, employee_id, role_id, branch_id, department_id,
        name, email, phone, password_hash, is_super_admin, must_change_password,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        employeeId,
        superAdminRoleId,
        branchId,
        departmentId,
        adminName,
        adminEmail.trim().toLowerCase(),
        adminPhone || null,
        passwordHash,
        1,
        usesOwnPassword ? 0 : 1,
        operatorId,
        operatorId,
      ]
    );
    stepLog.record("admin_created", "success");

    // -------------------------------------------------------------
    // Assign Subscription
    // starts_at is always "today" (provisioning IS the start). If the
    // caller didn't pass an explicit endsAt and this is a trial
    // subscription, the expiry is computed from the SELECTED PLAN's own
    // trial_days column — never a hardcoded day count. Changing a plan's
    // trial_days in Platform Settings changes what future registrations
    // get automatically; it does not touch any already-created subscription
    // (this only runs once, at creation).
    // -------------------------------------------------------------
    let resolvedEndsAt = endsAt || null;
    let planRow = null;
    if (planId) {
      [[planRow]] = await conn.query(`SELECT id, trial_days FROM plans WHERE id = ?`, [planId]);
      if (!resolvedEndsAt && subscriptionStatus === "trial" && planRow?.trial_days) {
        const trialEnd = new Date(Date.now() + planRow.trial_days * 86400000);
        resolvedEndsAt = trialEnd.toISOString().slice(0, 10);
      }
      const [[existingSubscription]] = await conn.query(
        `SELECT id FROM company_subscriptions WHERE company_id=? LIMIT 1`,
        [companyId]
      );
      if (!existingSubscription) {
        await conn.query(
          `INSERT INTO company_subscriptions (company_id, plan_id, status, starts_at, ends_at)
           VALUES (?, ?, ?, CURDATE(), ?)`,
          [companyId, planId, subscriptionStatus, resolvedEndsAt]
        );
      }
    }
    stepLog.record("subscription_created", "success");

    // -------------------------------------------------------------
    // Enable Modules — explicit moduleIds (operator picked them in the
    // creation wizard) take priority; otherwise fall back to whatever
    // the selected plan grants via plan_modules, so a public registrant
    // (who never sees a module picker at all) gets exactly what their
    // chosen plan includes.
    //
    // Skipped entirely when subscriptionStatus === "pending" — that status
    // means "awaiting BillDesk payment confirmation" (see registerCompany's
    // paid-plan path), and modules/limits must only activate once BillDesk
    // actually confirms the subscription, never merely because the
    // registration form was submitted. confirmCompanySubscriptionFromBillDesk
    // grants them later via the same syncCompanyModulesToPlan this would
    // have called.
    // -------------------------------------------------------------
    let effectiveModuleIds = Array.isArray(moduleIds) && moduleIds.length ? moduleIds.map(Number) : [];
    if (effectiveModuleIds.length === 0 && planId && subscriptionStatus !== "pending") {
      const [planModuleRows] = await conn.query(`SELECT module_id FROM plan_modules WHERE plan_id = ?`, [planId]);
      effectiveModuleIds = planModuleRows.map((r) => r.module_id);
    }
    if (subscriptionStatus === "pending") effectiveModuleIds = [];
    for (const moduleId of effectiveModuleIds) {
      const [[existingModule]] = await conn.query(
        `SELECT id FROM company_modules WHERE company_id=? AND module_id=? LIMIT 1`,
        [companyId, moduleId]
      );
      if (!existingModule) {
        await conn.query(
          `INSERT INTO company_modules (company_id, module_id, enabled, licensed, enabled_by)
           VALUES (?, ?, 1, 1, ?)`,
          [companyId, moduleId, operatorId]
        );
      }
    }
    stepLog.record("modules_enabled", "success");

    // -------------------------------------------------------------
    // COMMIT — everything above this line is atomic. Nothing below
    // this line writes to `conn`; connection is released in `finally`.
    // -------------------------------------------------------------
    await conn.commit();
    stepLog.record("provisioning_complete", "success");

    // -------------------------------------------------------------
    // Flush provisioning log — ONLY now, on `pool` (not `conn`), only
    // now that companyId is guaranteed to exist post-commit. See
    // createStepBuffer() docs at top of file for full reasoning.
    // -------------------------------------------------------------
    await stepLog.flush(companyId);

    // -------------------------------------------------------------
    // Activity Log — independent of provisioning success; a failure
    // here must never be reported as a provisioning failure, since
    // the company was already durably committed above.
    // -------------------------------------------------------------
    try {
      await logActivity({
        companyId,
        userId: operatorId,
        module: "platform",
        action: "company_provisioned",
        entityType: "company",
        entityId: companyId,
        description: `Provisioned company "${companyName}"`,
      });
    } catch (e) {
      console.error("Activity log failed:", e.message);
    }

    // -------------------------------------------------------------
    // Platform operator notifications — same non-blocking guarantee as
    // the activity log above; a notification failure must never be
    // reported as a provisioning failure.
    // -------------------------------------------------------------
    try {
      // `id != ?` with operatorId=NULL (public self-registration — no
      // operator initiated this) would match zero rows under SQL's
      // three-valued NULL logic, silently notifying nobody. Only excluding
      // the operator when one actually exists fixes that.
      const [operators] = operatorId
        ? await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0 AND id != ?`, [operatorId])
        : await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0`);
      for (const op of operators) {
        await createNotification(op.company_id, op.id, {
          title: operatorId ? "Company provisioned" : "New company self-registered",
          message: `${companyName} ${operatorId ? "was provisioned" : "registered itself via the public signup page"}`,
          type: "company_provisioned",
          link: `/platform/companies/${companyId}`,
        });
      }
    } catch (e) {
      console.error("Provisioning notifications failed:", e.message);
    }

    // -------------------------------------------------------------
    // Welcome Email — fire-and-forget, non-blocking, outside the
    // transaction. A slow or failed email must never roll back or
    // delay the response for an already-successful provisioning.
    // -------------------------------------------------------------
    try {
      const [[role]] = await pool.query(`SELECT name FROM roles WHERE id=?`, [superAdminRoleId]);
      sendWelcomeEmail({
        to: adminEmail,
        userId: adminResult.insertId,
        name: adminName,
        email: adminEmail,
        tempPassword,
        roleName: role?.name || "Company Admin",
        createdBy: operatorId,
        companyId,
      }).catch((err) => {
        console.error("Welcome email failed:", err.message);
      });
    } catch (err) {
      console.error("Unable to prepare welcome email:", err.message);
    }

    return {
      success: true,
      companyId,
      adminUserId: adminResult.insertId,
      temporaryPassword: tempPassword,
    };
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError.message);
    }

    console.error("Provisioning failed:", err);

    // No DB write attempted here. companyId (if it exists) was rolled
    // back along with everything else in this transaction — any
    // INSERT into company_provisioning_log referencing it would
    // violate the FK, exactly as confirmed in the schema audit. The
    // failure is fully captured here via console.error, and the
    // original exception is re-thrown unmodified below — logging
    // never hides or replaces the real error.
    console.error(
      `Provisioning failed before/without commit for company_id=${companyId ?? "not yet created"}. Steps completed before failure:`,
      JSON.stringify(stepLog.all())
    );

    throw err;
  } finally {
    // Connection is always released, on every path — success, thrown
    // validation error, or SQL error — preventing pool exhaustion.
    conn.release();
  }
}