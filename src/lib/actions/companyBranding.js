import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { getSettingsByGroup, updateSettings } from "@/lib/actions/settings";

// The 6 Identity fields a school's own Settings can never set — always
// resolved from the parent company instead (see getCompanyBranding below).
// Company Logo is deliberately NOT in this list — schools keep their own.
const PARENT_LOCKED_KEYS = ["faviconUrl", "sidebarLogoUrl", "watermarkLogoUrl", "loginLogoUrl", "websiteLogoUrl", "backgroundImageUrl"];

export async function getCompanyBranding(session) {
  const [[company]] = await pool.query(
    `SELECT id, name, logo_url, favicon_url, primary_color, secondary_color, website, contact_email, contact_phone, address, currency, parent_company_id FROM companies WHERE id=?`,
    [session.company_id]
  );
  const extended = await getSettingsByGroup(session, "branding");
  const result = {
    name: company?.name || "",
    currency: company?.currency || "INR",
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
    brandingLocked: false,
  };

  // A school always shows the PARENT platform's own branding for every
  // Identity slot except Company Logo — so every school consistently looks
  // like the parent (e.g. "Global Vista Educators"), never whatever a
  // school admin might otherwise upload. Company Logo is deliberately left
  // reading from the child itself (see PARENT_LOCKED_KEYS above).
  if (session.is_child_company && company?.parent_company_id) {
    const [[parentCompany]] = await pool.query(`SELECT favicon_url FROM companies WHERE id=?`, [company.parent_company_id]);
    const parentExtended = await getSettingsByGroup({ company_id: company.parent_company_id }, "branding");
    result.faviconUrl = parentCompany?.favicon_url || "";
    result.sidebarLogoUrl = parentExtended.sidebar_logo_url || "";
    result.watermarkLogoUrl = parentExtended.watermark_logo_url || "";
    result.loginLogoUrl = parentExtended.login_logo_url || "";
    result.websiteLogoUrl = parentExtended.website_logo_url || "";
    result.backgroundImageUrl = parentExtended.background_image_url || "";
    result.brandingLocked = true;
  }

  return result;
}

export async function updateCompanyBranding(session, data, updatedBy) {
  // Defense in depth — a school's Identity form never even renders these
  // controls (see CompanyBrandingSettingsForm.js), but a forged request
  // must not be able to write them either. Company Logo (logoUrl) and
  // colors/Contact/Personalization still save normally for a school (those
  // sections just happen to be hidden in the UI too).
  const locked = session.is_child_company;

  const companySets = ["logo_url=?", "primary_color=?", "secondary_color=?", "website=?", "contact_email=?", "contact_phone=?", "address=?"];
  const companyParams = [data.logoUrl || null, data.primaryColor || "#4f46e5", data.secondaryColor || "#171717", data.website || null, data.contactEmail || null, data.contactPhone || null, data.address || null];
  if (!locked) { companySets.push("favicon_url=?"); companyParams.push(data.faviconUrl || null); }
  companySets.push("updated_by=?");
  companyParams.push(updatedBy, session.company_id);
  await pool.query(`UPDATE companies SET ${companySets.join(", ")} WHERE id=?`, companyParams);

  const extendedValues = {
    sidebar_logo_url: data.sidebarLogoUrl || "", watermark_logo_url: data.watermarkLogoUrl || "",
    login_logo_url: data.loginLogoUrl || "", email_logo_url: data.emailLogoUrl || "",
    website_logo_url: data.websiteLogoUrl || "", background_image_url: data.backgroundImageUrl || "",
    accent_color: data.accentColor || "", dashboard_greeting: data.dashboardGreeting || "",
    company_description: data.companyDescription || "", support_email: data.supportEmail || "",
    support_phone: data.supportPhone || "", footer_text: data.footerText || "",
  };
  if (locked) {
    for (const key of ["sidebar_logo_url", "watermark_logo_url", "login_logo_url", "email_logo_url", "website_logo_url", "background_image_url"]) {
      delete extendedValues[key];
    }
  }
  await updateSettings(session, "branding", extendedValues, updatedBy);

  await logActivity({ userId: updatedBy, module: "settings", action: "branding_update", entityType: "company", entityId: session.company_id, description: "Updated company branding", companyId: session.company_id });
}

/** Minimal branding lookup for outbound email templates — no session required. */
export async function getBrandingForEmail(companyId) {
  if (!companyId) return null;
  const [[company]] = await pool.query(`SELECT name, logo_url, primary_color FROM companies WHERE id=?`, [companyId]);
  return company ? { companyName: company.name, logoUrl: company.logo_url, primaryColor: company.primary_color } : null;
}
