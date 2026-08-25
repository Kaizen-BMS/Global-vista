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
export async function hasPlanRazorpayColumns() { return columnExists("plans", "razorpay_plan_id"); }
export async function hasCompanySubscriptionsGatewayColumns() { return columnExists("company_subscriptions", "gateway"); }
export async function hasSubscriptionPaymentsTable() { return tableExists("subscription_payments"); }
export async function hasPaymentWebhookEventsTable() { return tableExists("payment_webhook_events"); }

/** True only once the ENTIRE 2026-08-16 company-subscription-billing migration
 * has been applied — every write path that touches the plans/
 * company_subscriptions columns or the two payment-billing tables (shared by
 * every gateway the platform has ever billed through) gates on this single
 * flag. */
export async function hasSubscriptionBillingSchema() {
  const [sub, payments, events] = await Promise.all([
    hasCompanySubscriptionsGatewayColumns(), hasSubscriptionPaymentsTable(), hasPaymentWebhookEventsTable(),
  ]);
  return sub && payments && events;
}

export async function hasLeadNoteTypeColumn() { return columnExists("lead_notes", "type"); }
export async function hasLeadNoteEditColumns() { return columnExists("lead_notes", "updated_at"); }
export async function hasLeadMeetingsSchema() { return tableExists("lead_meetings"); }

export async function hasComplaintsSchema() { return tableExists("complaints"); }
export async function hasIdeasSchema() { return tableExists("ideas"); }

export async function hasBlogSchema() { return tableExists("blog_posts"); }
export async function hasOffersSchema() { return tableExists("platform_offers"); }
export async function hasCouponsSchema() { return tableExists("coupons"); }

export async function hasLeadFieldSectionsSchema() { return tableExists("lead_field_sections"); }
export async function hasLeadFieldLayoutSchema() { return tableExists("lead_field_layout"); }

/** True only once BOTH new tables behind the Lead Form Builder exist —
 * every read/write path in leadFieldLayout.js gates on this single flag. */
export async function hasLeadFormBuilderSchema() {
  const [sections, layout] = await Promise.all([hasLeadFieldSectionsSchema(), hasLeadFieldLayoutSchema()]);
  return sections && layout;
}
