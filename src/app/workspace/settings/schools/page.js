import { getSession } from "@/lib/auth";
import { isSuperAdminAccount } from "@/lib/helpers/permissions";
import { getSchoolsOverview } from "@/lib/actions/companySwitch";
import ForbiddenState from "@/components/shared/ForbiddenState";
import SettingsTabs from "@/components/shared/SettingsTabs";
import CreateSchoolForm from "@/components/settings/CreateSchoolForm";
import SchoolsOverview from "@/components/settings/SchoolsOverview";

// Only reachable when the Platform Operator has explicitly granted this
// company can_create_child_companies (see CanCreateChildrenToggle on the
// Platform Console's company detail page) — SettingsTabs itself already
// hides the "Schools" tab for every other company, this page-level gate
// is the real enforcement boundary, same split as every other settings
// page in this app.
export default async function SchoolsSettingsPage() {
  const session = await getSession();
  if (!isSuperAdminAccount(session) || !session.can_create_child_companies) return <ForbiddenState />;

  const { schools, totals } = await getSchoolsOverview(session);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1 whitespace-nowrap">Schools</h1>
      <SettingsTabs session={session} />
      <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
        Every school below is a completely independent company — its own isolated data, users, and dashboard. The numbers above the table are all your schools combined; click "View" on any row to switch into just that one.
      </p>

      <div className="space-y-6">
        <SchoolsOverview schools={schools} totals={totals} />
        <CreateSchoolForm />
      </div>
    </div>
  );
}
