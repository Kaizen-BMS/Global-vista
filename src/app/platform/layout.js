import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPlatformOperator } from "@/lib/helpers/permissions";
import { PLATFORM_NAV_ITEMS } from "@/lib/constants/navItems";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import { getPlatformTimezone } from "@/lib/platform/actions/settings";
import Sidebar from "@/components/layout/Sidebar";
import PlatformTopbar from "@/components/layout/PlatformTopbar";
import PageTransition from "@/components/shared/PageTransition";
import BrandFavicon from "@/components/shared/BrandFavicon";
import { TimezoneProvider } from "@/components/shared/TimezoneProvider";
import { MobileNavProvider } from "@/components/layout/MobileNavContext";
import SessionLivenessWatcher from "@/components/shared/SessionLivenessWatcher";

// KaizenBMS's own identity, not a tenant's — deliberately never
// pulled from the companies table, per the branding rule that the
// Platform Console always shows the platform owner's own identity, never a
// tenant's. Sourced entirely from GLOBAL_VISTA_BRANDING — the single
// constant also used by the pre-login auth pages — so the sidebar can
// never drift out of sync with what Login shows.
const PLATFORM_IDENTITY = {
  name: GLOBAL_VISTA_BRANDING.name,
  short_name: GLOBAL_VISTA_BRANDING.shortName,
  logo_url: GLOBAL_VISTA_BRANDING.logoUrl,
  primary_color: GLOBAL_VISTA_BRANDING.primaryColor,
};

export default async function PlatformLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isPlatformOperator(session)) redirect("/workspace/dashboard");
  const timezone = await getPlatformTimezone();

  return (
    <TimezoneProvider timezone={timezone}>
      <MobileNavProvider>
        <div className="h-screen bg-background flex overflow-hidden" style={{ "--brand-primary": PLATFORM_IDENTITY.primary_color, "--brand-secondary": GLOBAL_VISTA_BRANDING.secondaryColor }}>
          <BrandFavicon faviconUrl={GLOBAL_VISTA_BRANDING.faviconUrl} />
          <SessionLivenessWatcher />
          <Sidebar session={session} navItems={PLATFORM_NAV_ITEMS} company={PLATFORM_IDENTITY} showPoweredBy={false} scope="platform" />
          <div className="flex-1 flex flex-col min-w-0">
            <PlatformTopbar session={session} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-[1600px] mx-auto w-full">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </MobileNavProvider>
    </TimezoneProvider>
  );
}
