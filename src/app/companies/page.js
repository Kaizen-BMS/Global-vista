import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { listCompanies } from "@/lib/platform/actions/companies";
import CompanyList from "@/components/platform/companies/CompanyList";

export default async function PlatformCompaniesPage() {
  const session = await getSession();
  assertPlatformOperator(session); // throws → caught by nearest error boundary if not authorized

  const companies = await listCompanies();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Companies</h1>
        <p className="text-neutral-500 text-sm">Platform-wide tenant management</p>
      </div>
      <CompanyList companies={companies} />
    </div>
  );
}