import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getCompanyBranding } from "@/lib/actions/companyBranding";
import SettingsTabs from "@/components/shared/SettingsTabs";
import ForbiddenState from "@/components/shared/ForbiddenState";
import CompanyBrandingSettingsForm from "@/components/forms/CompanyBrandingSettingsForm";

export default async function BrandingPage() {
  const session = await getSession();
  if (!isSuperAdmin(session)) return <ForbiddenState />;
  const branding = await getCompanyBranding(session);

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <SettingsTabs />
      <p className="text-neutral-500 text-sm mb-6 max-w-2xl">
        Your logo, colors, and contact details appear across the sidebar, reports, and outgoing emails —
        the moment you save, the whole workspace reflects it.
      </p>
      <CompanyBrandingSettingsForm initial={branding} />
    </div>
  );
}
