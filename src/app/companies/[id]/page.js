import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { getCompanyDetail } from "@/lib/platform/actions/companies";
import ModuleToggleList from "@/components/platform/companies/ModuleToggleList";
import CrmNotFound from "@/app/crm/(protected)/not-found";

export default async function CompanyDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  assertPlatformOperator(session);

  const company = await getCompanyDetail(id);
  if (!company) return <CrmNotFound />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">{company.name}</h1>
        <p className="text-neutral-500 text-sm">{company.country} · {company.status}</p>
      </div>
      <ModuleToggleList companyId={company.id} modules={company.modules} />
    </div>
  );
}