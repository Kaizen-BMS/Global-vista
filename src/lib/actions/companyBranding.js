import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { getSettingsByGroup, updateSettings } from "@/lib/actions/settings";

export async function getCompanyBranding(session) {
  const [[company]] = await pool.query(
    `SELECT id, name, logo_url, favicon_url, primary_color, secondary_color, website, contact_email, contact_phone, address FROM companies WHERE id=?`,
    [session.company_id]
  );
  const extended = await getSettingsByGroup(session, "branding");
  return {
    name: company?.name || "",
    logoUrl: company?.logo_url || "",
    faviconUrl: company?.favicon_url || "",
    primaryColor: company?.primary_color || "#4f46e5",
    secondaryColor: company?.secondary_color || "#171717",
    website: company?.website || "",
    contactEmail: company?.contact_email || "",
    contactPhone: company?.contact_phone || "",
    address: company?.address || "",
    sidebarLogoUrl: extended.sidebar_logo_url || "",
    watermarkLogoUrl: extended.watermark_logo_url || "",
    loginLogoUrl: extended.login_logo_url || "",
    emailLogoUrl: extended.email_logo_url || "",
    websiteLogoUrl: extended.website_logo_url || "",
    backgroundImageUrl: extended.background_image_url || "",
    accentColor: extended.accent_color || "",
    dashboardGreeting: extended.dashboard_greeting || "",
    companyDescription: extended.company_description || "",
    supportEmail: extended.support_email || "",
    supportPhone: extended.support_phone || "",
    footerText: extended.footer_text || "",
  };
}

export async function updateCompanyBranding(session, data, updatedBy) {
  await pool.query(
    `UPDATE companies SET logo_url=?, favicon_url=?, primary_color=?, secondary_color=?, website=?, contact_email=?, contact_phone=?, address=?, updated_by=? WHERE id=?`,
    [
      data.logoUrl || null, data.faviconUrl || null, data.primaryColor || "#4f46e5", data.secondaryColor || "#171717",
      data.website || null, data.contactEmail || null, data.contactPhone || null, data.address || null,
      updatedBy, session.company_id,
    ]
  );

  const extendedValues = {
    sidebar_logo_url: data.sidebarLogoUrl || "", watermark_logo_url: data.watermarkLogoUrl || "",
    login_logo_url: data.loginLogoUrl || "", email_logo_url: data.emailLogoUrl || "",
    website_logo_url: data.websiteLogoUrl || "", background_image_url: data.backgroundImageUrl || "",
    accent_color: data.accentColor || "", dashboard_greeting: data.dashboardGreeting || "",
    company_description: data.companyDescription || "", support_email: data.supportEmail || "",
    support_phone: data.supportPhone || "", footer_text: data.footerText || "",
  };
  await updateSettings(session, "branding", extendedValues, updatedBy);

  await logActivity({ userId: updatedBy, module: "settings", action: "branding_update", entityType: "company", entityId: session.company_id, description: "Updated company branding", companyId: session.company_id });
}

/** Minimal branding lookup for outbound email templates — no session required. */
export async function getBrandingForEmail(companyId) {
  if (!companyId) return null;
  const [[company]] = await pool.query(`SELECT name, logo_url, primary_color FROM companies WHERE id=?`, [companyId]);
  return company ? { companyName: company.name, logoUrl: company.logo_url, primaryColor: company.primary_color } : null;
}
