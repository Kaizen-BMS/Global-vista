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
/** Trial/Silver/Gold/Diamond tiered-pricing migration — pricing_model,
 * the marketing-label fields, allow_import_export, and
 * company_subscriptions.seat_quantity all land together; any one column
 * standing in for "has the whole thing run" is fine, same convention as
 * every other bundled migration here. The migration also added
 * plans.maintenance_annual_fee and company_subscriptions.
 * maintenance_gateway_subscription_id for a separate annual-maintenance-fee
 * feature that has since been removed — those columns are no longer read
 * or written by any create/edit path, only defensively cleaned up (any
 * leftover value cancelled and cleared) wherever a subscription's gateway
 * state already gets touched. */
export async function hasTieredPlansSchema() { return columnExists("plans", "pricing_model"); }
export async function hasCompanySubscriptionsGatewayColumns() { return columnExists("company_subscriptions", "gateway"); }
export async function hasCancelAtPeriodEndColumn() { return columnExists("company_subscriptions", "cancel_at_period_end"); }
export async function hasPendingPlanIdColumn() { return columnExists("company_subscriptions", "pending_plan_id"); }
export async function hasDurationPricingSchema() { return tableExists("plan_duration_prices"); }
export async function hasCommitmentMonthsColumn() { return columnExists("company_subscriptions", "commitment_months"); }
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
export async function hasFollowupCompletedAtColumn() { return columnExists("lead_followups", "completed_at"); }
export async function hasPaymentRequestsSchema() { return tableExists("payment_requests"); }
export async function hasLeadMeetingsSchema() { return tableExists("lead_meetings"); }
export async function hasLeadCallsSchema() { return tableExists("lead_calls"); }

export async function hasComplaintsSchema() { return tableExists("complaints"); }
export async function hasPlatformSupportSchema() { return tableExists("platform_support_tickets"); }
export async function hasIdeasSchema() { return tableExists("ideas"); }

export async function hasBlogSchema() { return tableExists("blog_posts"); }
export async function hasOffersSchema() { return tableExists("platform_offers"); }
export async function hasOfferImageColumn() { return columnExists("platform_offers", "image_url"); }
export async function hasCouponsSchema() { return tableExists("coupons"); }
export async function hasUserNotificationPreferencesSchema() { return tableExists("user_notification_preferences"); }
export async function hasPartnersSchema() { return tableExists("partners"); }

/** Messages v2 migration — message_type + edited_at land together, so
 * either can stand in for "has the whole migration run", but editing code
 * checks edited_at specifically since that's the column it writes to. */
export async function hasMessageEditingSchema() { return columnExists("messages", "edited_at"); }
export async function hasBlockedUsersSchema() { return tableExists("blocked_users"); }
export async function hasAnnouncementDismissalsSchema() { return tableExists("announcement_dismissals"); }

export async function hasLeadFieldSectionsSchema() { return tableExists("lead_field_sections"); }
export async function hasLeadFieldLayoutSchema() { return tableExists("lead_field_layout"); }

/** True only once BOTH new tables behind the Lead Form Builder exist —
 * every read/write path in leadFieldLayout.js gates on this single flag. */
export async function hasLeadFormBuilderSchema() {
  const [sections, layout] = await Promise.all([hasLeadFieldSectionsSchema(), hasLeadFieldLayoutSchema()]);
  return sections && layout;
}

/** Seat-block billing + GSTIN migration — companies.gstin and
 * subscription_payments.seat_quantity/gst_amount land together. */
export async function hasGstinColumn() { return columnExists("companies", "gstin"); }
export async function hasPaymentSeatBreakdownColumns() { return columnExists("subscription_payments", "seat_quantity"); }
