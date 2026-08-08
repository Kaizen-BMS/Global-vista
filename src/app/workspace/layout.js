import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPlatformOperator, isCompanySuspended } from "@/lib/helpers/permissions";
import { getVisibleNavItems } from "@/lib/helpers/menu";
import { getCurrentCompany } from "@/lib/platform/tenant";
import { getPlatformSettingsByGroup } from "@/lib/platform/actions/settings";
import { getSettingsByGroup } from "@/lib/actions/settings";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import PageTransition from "@/components/shared/PageTransition";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import BrandFavicon from "@/components/shared/BrandFavicon";
import CompanySuspendedPage from "@/components/shared/CompanySuspendedPage";
import { TimezoneProvider } from "@/components/shared/TimezoneProvider";
import { MobileNavProvider } from "@/components/layout/MobileNavContext";

export default async function WorkspaceLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isPlatformOperator(session)) redirect("/platform");
  if (isCompanySuspended(session)) return <CompanySuspendedPage />;
  const [navItems, baseCompany, platformBranding, extendedBranding, systemSettings] = await Promise.all([
    getVisibleNavItems(session), getCurrentCompany(session.company_id), getPlatformSettingsByGroup("branding"), getSettingsByGroup(session, "branding"),
    getSettingsByGroup(session, "system"),
  ]);
  const timezone = systemSettings.timezone || "UTC";
  const hour12 = systemSettings.time_format !== "24h";
  const company = { ...baseCompany, sidebar_logo_url: extendedBranding.sidebar_logo_url || null };
  const showPoweredBy = platformBranding.powered_by_enabled !== "false";

  return (
    <TimezoneProvider timezone={timezone} hour12={hour12}>
      <MobileNavProvider>
        <div
          className="h-screen bg-background flex overflow-hidden"
          style={{ "--brand-primary": company?.primary_color || "#4f46e5", "--brand-secondary": company?.secondary_color || "#171717" }}
        >
          <BrandFavicon faviconUrl={company?.favicon_url} />
          <Sidebar session={session} navItems={navItems} company={company} showPoweredBy={showPoweredBy} />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar company={company} session={session} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {session.must_change_password ? <div className="max-w-md mx-auto mt-12"><h1 className="text-xl font-semibold text-foreground mb-1">Set a New Password</h1><ChangePasswordForm forced /></div> : <PageTransition>{children}</PageTransition>}
            </main>
          </div>
        </div>
      </MobileNavProvider>
    </TimezoneProvider>
  );
}