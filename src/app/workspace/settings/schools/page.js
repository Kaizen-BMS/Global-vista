import { getSession } from "@/lib/auth";
import { isSuperAdminAccount } from "@/lib/helpers/permissions";
import { listChildCompanies } from "@/lib/actions/companySwitch";
import ForbiddenState from "@/components/shared/ForbiddenState";
import SettingsTabs from "@/components/shared/SettingsTabs";
import CreateSchoolForm from "@/components/settings/CreateSchoolForm";

// Only reachable when the Platform Operator has explicitly granted this
// company can_create_child_companies (see CanCreateChildrenToggle on the
// Platform Console's company detail page) — SettingsTabs itself already
// hides the "Schools" tab for every other company, this page-level gate
// is the real enforcement boundary, same split as every other settings
// page in this app.
export default async function SchoolsSettingsPage() {
  const session = await getSession();
  if (!isSuperAdminAccount(session) || !session.can_create_child_companies) return <ForbiddenState />;

  const schools = await listChildCompanies(session);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1 whitespace-nowrap">Schools</h1>
      <SettingsTabs session={session} />
      <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
        Every school below is a completely independent company — its own data, users, and dashboard — controlled under {session.name ? "your account" : "this company"}.
        Switch into any of them from your profile menu, top-right.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreateSchoolForm />
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-foreground font-medium mb-3">Your Schools ({schools.length})</p>
          {schools.length === 0 ? (
            <p className="text-muted-foreground text-sm">No schools yet — create one on the left.</p>
          ) : (
            <div className="space-y-2">
              {schools.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/40">
                  <span className="text-foreground">{s.name}</span>
                  <span className="text-muted-foreground text-xs">{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
