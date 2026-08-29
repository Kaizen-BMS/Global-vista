import "server-only";
import { pool } from "@/lib/db";
import { createNotification } from "@/lib/actions/notifications";

const DAY_THRESHOLDS = [30, 7, 3, 1];
const STORAGE_THRESHOLDS = [100, 90, 80];
// A daily-or-more-frequent cron could otherwise fire the same threshold
// notification repeatedly the same day — this is the entire dedupe
// mechanism: skip if one of this exact type already exists for the
// company inside the window, no separate "already notified" table needed.
const DEDUPE_WINDOW_HOURS = 20;

async function alreadyNotified(companyId, type) {
  const [[row]] = await pool.query(
    `SELECT id FROM notifications WHERE company_id=? AND type=? AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR) LIMIT 1`,
    [companyId, type, DEDUPE_WINDOW_HOURS]
  );
  return !!row;
}

async function recipientsFor(companyId) {
  const [rows] = await pool.query(
    `SELECT id FROM users WHERE company_id=? AND is_deleted=0 AND status='active' AND is_super_admin=1`,
    [companyId]
  );
  return rows.map((r) => r.id);
}

async function notifyPlatformOperators(payload) {
  const [operators] = await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0`);
  for (const op of operators) {
    await createNotification(op.company_id, op.id, payload).catch(() => {});
  }
}

/**
 * Meant to run on a schedule (see /api/cron/subscription-warnings) — pure
 * read of live company_subscriptions/plans/storage data each time, no
 * cached state. Returns what it did so the cron response is inspectable,
 * same pattern as the lead-sync and follow-up-reminder crons.
 */
export async function runSubscriptionWarningsCheck() {
  const results = { subscriptionWarnings: 0, storageWarnings: 0, cancellationsFinalized: 0 };

  // Access was already cut off the moment ends_at passed (tenant.js checks
  // that live, independent of `status`) — this just tidies the stored
  // status for subscriptions that chose "cancel at period end" so admin
  // views/reports read "Cancelled" instead of forever showing "Active"
  // after they've actually lapsed.
  const [finalizeResult] = await pool.query(`
    UPDATE company_subscriptions
    SET status = 'cancelled'
    WHERE cancel_at_period_end = 1 AND status != 'cancelled' AND ends_at IS NOT NULL AND ends_at < CURDATE()
  `).catch(() => [{ affectedRows: 0 }]); // pre-migration DB — column doesn't exist yet
  results.cancellationsFinalized = finalizeResult.affectedRows || 0;

  const [subs] = await pool.query(`
    SELECT cs.id, cs.company_id, cs.ends_at, cs.status, c.name AS company_name, p.name AS plan_name
    FROM company_subscriptions cs
    JOIN companies c ON c.id = cs.company_id AND c.status = 'active'
    JOIN plans p ON p.id = cs.plan_id
    WHERE cs.status IN ('trial','active','past_due') AND cs.ends_at IS NOT NULL
  `);
  const now = new Date();
  for (const sub of subs) {
    const daysRemaining = Math.ceil((new Date(sub.ends_at).getTime() - now.getTime()) / 86400000);
    if (!DAY_THRESHOLDS.includes(daysRemaining)) continue;
    const type = `subscription_expiring_${daysRemaining}`;
    if (await alreadyNotified(sub.company_id, type)) continue;

    const message = daysRemaining === 1
      ? "Your subscription expires tomorrow."
      : `Your subscription expires in ${daysRemaining} days.`;
    const recipients = await recipientsFor(sub.company_id);
    for (const userId of recipients) {
      await createNotification(sub.company_id, userId, { title: "Subscription Expiring", message, type, link: "/workspace/settings/subscription" }).catch(() => {});
    }
    await notifyPlatformOperators({ title: "Company subscription expiring", message: `${sub.company_name} (${sub.plan_name}) — ${message}`, type, link: `/platform/companies/${sub.company_id}` });
    results.subscriptionWarnings++;
  }

  const [companies] = await pool.query(`
    SELECT c.id, c.name, p.max_storage_mb
    FROM companies c
    LEFT JOIN company_subscriptions cs ON cs.id = (SELECT id FROM company_subscriptions WHERE company_id=c.id ORDER BY created_at DESC LIMIT 1)
    LEFT JOIN plans p ON p.id = cs.plan_id
    WHERE c.status = 'active' AND p.max_storage_mb IS NOT NULL
  `);
  for (const company of companies) {
    const [[usage]] = await pool.query(
      `SELECT COALESCE((SELECT SUM(file_size) FROM employee_documents WHERE company_id=? AND is_deleted=0),0) +
              COALESCE((SELECT SUM(file_size) FROM lead_documents WHERE company_id=?),0) AS used_bytes`,
      [company.id, company.id]
    );
    const limitBytes = company.max_storage_mb * 1024 * 1024;
    const percentUsed = Math.floor((Number(usage.used_bytes) / limitBytes) * 100);
    const threshold = STORAGE_THRESHOLDS.find((t) => percentUsed >= t);
    if (!threshold) continue;
    const type = `storage_${threshold}`;
    if (await alreadyNotified(company.id, type)) continue;

    const message = threshold >= 100 ? "Storage limit reached." : `Storage usage is at ${threshold}%.`;
    const recipients = await recipientsFor(company.id);
    for (const userId of recipients) {
      await createNotification(company.id, userId, { title: "Storage Warning", message, type, link: "/workspace/settings/subscription" }).catch(() => {});
    }
    results.storageWarnings++;
  }

  return results;
}
