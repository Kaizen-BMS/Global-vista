import "server-only";
import { pool } from "@/lib/db";
import { hasSubscriptionBillingSchema } from "@/lib/db/schemaFlags";
import { getSubscriptionBillingStats } from "@/lib/platform/actions/subscriptionBilling";
export { resolveRange } from "@/lib/helpers/dateRange";

/**
 * Single entry point for the platform executive dashboard. Every number
 * here is a real query against the live schema. Revenue/payments come from
 * subscription_payments (the 2026-08-16 billing migration) via
 * getSubscriptionBillingStats() plus the two range-scoped queries below;
 * on a pre-migration database this degrades to zeros/empty rather than
 * throwing, same as everywhere else that table is read.
 */
export async function getPlatformDashboard({ start, end }) {
  const billingReady = await hasSubscriptionBillingSchema();

  const [
    [[companyCounts]],
    [subStatusRows],
    [[userCounts]],
    [[storageRow]],
    [moduleUsageRows],
    [planDistributionRows],
    [companyGrowthRows],
    [loginActivityRows],
    [provisioningHistoryRows],
    [recentCompanies],
    [recentSubscriptions],
    [recentErrors],
    [recentPlatformEvents],
    [[newCompanies]],
    [[expiringLicenses]],
    [[pendingProvisioning]],
    billingStats,
    [periodRevenueRows],
    [revenueTrendRows],
    [latestPayments],
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total, SUM(status='active') AS active FROM companies`),
    pool.query(`
      SELECT cs.status, COUNT(*) AS count FROM company_subscriptions cs
      INNER JOIN (SELECT company_id, MAX(id) AS max_id FROM company_subscriptions GROUP BY company_id) latest
        ON latest.max_id = cs.id
      GROUP BY cs.status
    `),
    pool.query(`SELECT COUNT(*) AS total, SUM(status='active') AS active FROM users WHERE is_deleted=0`),
    pool.query(`
      SELECT
        (SELECT COALESCE(SUM(file_size),0) FROM lead_documents) +
        (SELECT COALESCE(SUM(file_size),0) FROM employee_documents WHERE is_deleted=0) AS total_bytes
    `),
    pool.query(`
      SELECT m.name, m.slug, COUNT(*) AS company_count
      FROM company_modules cm JOIN modules m ON m.id = cm.module_id
      WHERE cm.enabled = 1
      GROUP BY m.id, m.name, m.slug ORDER BY company_count DESC
    `),
    pool.query(`
      SELECT p.name AS plan, COUNT(*) AS count FROM company_subscriptions cs
      INNER JOIN (SELECT company_id, MAX(id) AS max_id FROM company_subscriptions GROUP BY company_id) latest
        ON latest.max_id = cs.id
      JOIN plans p ON p.id = cs.plan_id
      GROUP BY p.id, p.name ORDER BY count DESC
    `),
    pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
      FROM companies WHERE created_at BETWEEN ? AND ?
      GROUP BY month ORDER BY month ASC
    `, [start, end]),
    pool.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS logins, COUNT(DISTINCT user_id) AS active_users
      FROM user_login_history WHERE event='login' AND created_at BETWEEN ? AND ?
      GROUP BY day ORDER BY day ASC
    `, [start, end]),
    pool.query(`
      SELECT DATE(created_at) AS day, SUM(status='success') AS success, SUM(status='failed') AS failed
      FROM company_provisioning_log WHERE created_at BETWEEN ? AND ?
      GROUP BY day ORDER BY day ASC
    `, [start, end]),
    pool.query(`SELECT id, name, slug, status, country, created_at FROM companies ORDER BY created_at DESC LIMIT 8`),
    pool.query(`
      SELECT cs.id, c.name AS company_name, p.name AS plan_name, cs.status, cs.starts_at, cs.ends_at
      FROM company_subscriptions cs JOIN companies c ON c.id = cs.company_id JOIN plans p ON p.id = cs.plan_id
      ORDER BY cs.created_at DESC LIMIT 8
    `),
    pool.query(`
      SELECT cpl.id, c.name AS company_name, cpl.step, cpl.detail, cpl.created_at
      FROM company_provisioning_log cpl JOIN companies c ON c.id = cpl.company_id
      WHERE cpl.status = 'failed' ORDER BY cpl.created_at DESC LIMIT 8
    `),
    pool.query(`
      SELECT pe.id, c.name AS company_name, pe.event_name, pe.created_at
      FROM platform_events pe JOIN companies c ON c.id = pe.company_id
      ORDER BY pe.created_at DESC LIMIT 8
    `),
    pool.query(`SELECT COUNT(*) AS count FROM companies WHERE created_at BETWEEN ? AND ?`, [start, end]),
    pool.query(`
      SELECT COUNT(*) AS count FROM company_subscriptions cs
      INNER JOIN (SELECT company_id, MAX(id) AS max_id FROM company_subscriptions GROUP BY company_id) latest
        ON latest.max_id = cs.id
      WHERE cs.status='active' AND cs.ends_at IS NOT NULL AND cs.ends_at <= DATE_ADD(NOW(), INTERVAL 30 DAY)
    `),
    pool.query(`SELECT COUNT(*) AS count FROM company_provisioning_log WHERE status='failed'`),
    getSubscriptionBillingStats(),
    billingReady
      ? pool.query(`SELECT currency, SUM(amount) AS total FROM subscription_payments WHERE status='completed' AND payment_date BETWEEN ? AND ? GROUP BY currency`, [start, end])
      : Promise.resolve([[]]),
    // Grouped by currency too, not just day — summing INR and USD rows
    // together into one number would be meaningless. Pivoted into one row
    // per day (with a column per currency actually seen) below.
    billingReady
      ? pool.query(`SELECT DATE(payment_date) AS day, currency, SUM(amount) AS amount FROM subscription_payments WHERE status='completed' AND payment_date BETWEEN ? AND ? GROUP BY day, currency ORDER BY day ASC`, [start, end])
      : Promise.resolve([[]]),
    billingReady
      ? pool.query(`
          SELECT sp.id, sp.amount, sp.currency, sp.status, sp.gateway, sp.payment_date, sp.created_at, c.name AS company_name, p.name AS plan_name
          FROM subscription_payments sp JOIN companies c ON c.id = sp.company_id JOIN plans p ON p.id = sp.plan_id
          ORDER BY sp.created_at DESC LIMIT 8
        `)
      : Promise.resolve([[]]),
  ]);

  const subStatus = Object.fromEntries(subStatusRows.map((r) => [r.status, r.count]));

  // Pivot [{day, currency, amount}] into [{day, INR: 100, USD: 20}] so the
  // chart can render one line per currency actually seen, instead of
  // silently adding incompatible currencies together.
  const revenueCurrencies = [...new Set(revenueTrendRows.map((r) => r.currency))];
  const revenueByDay = new Map();
  for (const r of revenueTrendRows) {
    const day = String(r.day);
    if (!revenueByDay.has(day)) revenueByDay.set(day, { day });
    revenueByDay.get(day)[r.currency] = Number(r.amount);
  }
  const revenueTrend = [...revenueByDay.values()].sort((a, b) => a.day.localeCompare(b.day));

  return {
    kpis: {
      totalCompanies: companyCounts.total,
      activeCompanies: companyCounts.active || 0,
      trialCompanies: subStatus.trial || 0,
      expiredCompanies: (subStatus.expired || 0) + (subStatus.cancelled || 0),
      activeUsers: userCounts.active || 0,
      totalEmployees: userCounts.total,
      crmUsage: moduleUsageRows.find((m) => m.slug === "crm")?.company_count || 0,
      storageUsageMb: Math.round((storageRow.total_bytes || 0) / (1024 * 1024) * 100) / 100,
      moduleUsageTotal: moduleUsageRows.reduce((s, m) => s + m.company_count, 0),
      newCompanies: newCompanies.count,
      pendingProvisioning: pendingProvisioning.count,
      activeLicenses: subStatus.active || 0,
      expiringLicenses: expiringLicenses.count,
      totalRevenueByCurrency: billingStats.revenueByCurrency,
      periodRevenueByCurrency: periodRevenueRows,
      failedPayments: billingStats.failedPaymentsCount,
      pastDueSubscriptions: billingStats.pastDueCount,
    },
    charts: {
      moduleUsage: moduleUsageRows,
      planDistribution: planDistributionRows,
      companyGrowth: companyGrowthRows,
      loginActivity: loginActivityRows,
      provisioningHistory: provisioningHistoryRows,
      subscriptionStatus: subStatusRows,
      revenueTrend,
      revenueCurrencies,
    },
    tables: {
      recentCompanies,
      recentSubscriptions,
      recentErrors,
      recentPlatformEvents,
      latestPayments,
    },
  };
}
