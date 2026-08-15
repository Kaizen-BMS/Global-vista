import "server-only";
import { pool } from "@/lib/db";

/**
 * Lets code that depends on a migration (lead custom fields, lead document
 * types) ship NOW without risking a 500 on every existing lead page the
 * moment it deploys, ahead of the SQL actually being run against the live
 * database. Cached for a short TTL (not per-process-lifetime) specifically
 * so the feature turns itself on within a minute of the migration being
 * applied — no redeploy needed once it lands.
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map();

async function exists(cacheKey, query, params) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  const [rows] = await pool.query(query, params);
  const value = rows.length > 0;
  cache.set(cacheKey, { value, at: Date.now() });
  return value;
}

async function tableExists(tableName) {
  return exists(`table:${tableName}`, `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`, [tableName]);
}
async function columnExists(tableName, columnName) {
  return exists(`col:${tableName}.${columnName}`, `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`, [tableName, columnName]);
}

export async function hasLeadCustomFieldsSchema() { return tableExists("lead_custom_fields"); }
export async function hasLeadDocumentTypesSchema() { return tableExists("lead_document_types"); }
export async function hasLeadDocumentTypeIdColumn() { return columnExists("lead_documents", "document_type_id"); }

export async function hasPlanDescriptionColumn() { return columnExists("plans", "description"); }
export async function hasPlanPayPalColumns() { return columnExists("plans", "paypal_plan_id"); }
export async function hasCompanySubscriptionsPayPalColumns() { return columnExists("company_subscriptions", "provider"); }
export async function hasSubscriptionPaymentsTable() { return tableExists("subscription_payments"); }
export async function hasPayPalWebhookEventsTable() { return tableExists("paypal_webhook_events"); }

/** True only once the ENTIRE 2026-08-15 PayPal migration has been applied — every write path that touches the new plans/company_subscriptions columns or the two new tables gates on this single flag. */
export async function hasPayPalBillingSchema() {
  const [plan, sub, payments, events] = await Promise.all([
    hasPlanPayPalColumns(), hasCompanySubscriptionsPayPalColumns(), hasSubscriptionPaymentsTable(), hasPayPalWebhookEventsTable(),
  ]);
  return plan && sub && payments && events;
}
