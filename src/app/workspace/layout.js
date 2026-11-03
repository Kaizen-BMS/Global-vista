import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can, isPlatformOperator, isCompanySuspended } from "@/lib/helpers/permissions";
import { getVisibleNavItems } from "@/lib/helpers/menu";
import { getVisibleGuideEntries } from "@/lib/helpers/guide";
import { getCurrentCompany, getSubscriptionDetails } from "@/lib/platform/tenant";
import { getPlatformSettingsByGroup } from "@/lib/platform/actions/settings";
import { getSettingsByGroup } from "@/lib/actions/settings";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import PageTransition from "@/components/shared/PageTransition";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import BrandFavicon from "@/components/shared/BrandFavicon";
import CompanySuspendedPage from "@/components/shared/CompanySuspendedPage";
import SubscriptionExpiredPage from "@/components/shared/SubscriptionExpiredPage";
import { TimezoneProvider } from "@/components/shared/TimezoneProvider";
import { MobileNavProvider } from "@/components/layout/MobileNavContext";
import FollowupReminderWatcher from "@/components/notifications/FollowupReminderWatcher";
import SessionLivenessWatcher from "@/components/shared/SessionLivenessWatcher";
import RealtimeUpdatesWatcher from "@/components/shared/RealtimeUpdatesWatcher";
import FeatureGuideWidget from "@/components/workspace/FeatureGuideWidget";
import OnboardingTour from "@/components/workspace/OnboardingTour";
import PeekSchoolWatcher from "@/components/workspace/PeekSchoolWatcher";
import ChildCompanyBanner from "@/components/workspace/ChildCompanyBanner";

export default async function WorkspaceLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isPlatformOperator(session)) redirect("/platform");
  if (isCompanySuspended(session)) return <CompanySuspendedPage />;

  // Checked fresh on every workspace request — not cached in the session
  // token, not something a client can influence — so this affects every
  // existing user of the company the instant ends_at passes, not just
  // future logins. Short-circuits before the rest of the page's queries
  // run at all when blocked.
  //
  // A child company (session.is_child_company — re-checked fresh in
  // getSession, same place company_status is) never gets a subscription
  // row at all, so getSubscriptionDetails would otherwise report
  // blocked:true ("no_subscription") here and wall off its ENTIRE
  // workspace before any dashboard page ever renders — exactly the
  // billing exemption this company is supposed to have, so it's
  // excluded from this gate the same way isCompanySuspended is above.
  const subscription = await getSubscriptionDetails(session.company_id);
  if (subscription.blocked && !session.is_child_company) {
    const [company, systemSettings] = await Promise.all([getCurrentCompany(session.company_id), getSettingsByGroup(session, "system")]);
    return (
      <SubscriptionExpiredPage
        companyName={company?.name || "Your company"}
        planName={subscription.planName}
        endsAt={subscription.endsAt}
        timezone={systemSettings.timezone || "UTC"}
      />
    );
  }

  // GVE "peeking" into one of its schools' leads (see openLeadAcrossCompanies)
  // is still, underneath, a real switch into that school's own session —
  // every data query on the page below is correctly scoped to it. But the
  // CHROME (sidebar nav, branding, the "Viewing X" banner) should keep
  // showing GVE's own, not visibly flip to the school's, which is what
  // navSession/brandingCompanyId below are for. A DELIBERATE switch via
  // UserMenu/SchoolsOverview never sets is_peeking, so it's unaffected —
  // that one is SUPPOSED to visibly show you've switched.
  const isPeeking = !!session.is_peeking;
  const navSession = isPeeking ? { ...session, company_id: session.home_company_id, is_child_company: false, can_create_child_companies: true } : session;
  const brandingCompanyId = isPeeking ? session.home_company_id : session.company_id;

  const [navItems, baseCompany, platformBranding, extendedBranding, systemSettings, canViewLeads, guideEntries, homeCompany] = await Promise.all([
    getVisibleNavItems(navSession), getCurrentCompany(brandingCompanyId), getPlatformSettingsByGroup("branding"), getSettingsByGroup({ company_id: brandingCompanyId }, "branding"),
    getSettingsByGroup(session, "system"), can(session, "leads.view"), getVisibleGuideEntries(navSession),
    session.home_company_id && !isPeeking ? getCurrentCompany(session.home_company_id) : Promise.resolve(null),
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
          <SessionLivenessWatcher />
          <RealtimeUpdatesWatcher />
          {canViewLeads && <FollowupReminderWatcher />}
          <Sidebar session={session} navItems={navItems} company={company} showPoweredBy={showPoweredBy} />
          <div className="flex-1 flex flex-col min-w-0">
            {session.home_company_id && !isPeeking && <ChildCompanyBanner companyName={company?.name} homeCompanyName={homeCompany?.name} />}
            <Topbar company={company} session={session} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {session.must_change_password ? <div className="max-w-md mx-auto mt-12"><h1 className="text-xl font-semibold text-foreground mb-1">Set a New Password</h1><ChangePasswordForm forced /></div> : <PageTransition>{children}</PageTransition>}
            </main>
          </div>
          {!session.must_change_password && <FeatureGuideWidget entries={guideEntries} />}
          {!session.must_change_password && <OnboardingTour isChildCompany={session.is_child_company} />}
          <PeekSchoolWatcher isPeeking={isPeeking} />
        </div>
      </MobileNavProvider>
    </TimezoneProvider>
  );
}