import { getCompanyDetail } from "@/lib/platform/actions/companies";
import ModuleToggleList from "@/components/platform/ModuleToggleList";
import CompanyBrandingForm from "@/components/platform/CompanyBrandingForm";

export default async function CompanyDetailPage({ params }) {
  const { id } = await params;
  const company = await getCompanyDetail(id);
  if (!company) return <div className="text-muted-foreground text-sm">Not found.</div>;
  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-semibold text-foreground">{company.name}</h1><p className="text-muted-foreground text-sm">{company.status}</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompanyBrandingForm companyId={company.id} company={company} />
        <div><p className="text-foreground font-medium mb-3">Modules</p><ModuleToggleList companyId={company.id} modules={company.modules} /></div>
      </div>
    </div>
  );
}