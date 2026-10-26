import Link from "next/link";
import { getCompanyDetail } from "@/lib/platform/actions/companies";
import ModuleToggleList from "@/components/platform/ModuleToggleList";
import CompanyBrandingForm from "@/components/platform/CompanyBrandingForm";
import DeleteCompanyDialog from "@/components/platform/DeleteCompanyDialog";

export default async function CompanyDetailPage({ params }) {
  const { id } = await params;
  const company = await getCompanyDetail(id);
  if (!company) return <div className="text-muted-foreground text-sm">Not found.</div>;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
        <p className="text-muted-foreground text-sm">{company.status}</p>
        {company.parentCompany && (
          <p className="text-muted-foreground text-sm mt-1">
            Child of <Link href={`/platform/companies/${company.parentCompany.id}`} className="text-indigo-400 hover:text-indigo-300 transition">{company.parentCompany.name}</Link> — billing-exempt
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CompanyBrandingForm companyId={company.id} company={company} />
        <div><p className="text-foreground font-medium mb-3">Modules</p><ModuleToggleList companyId={company.id} modules={company.modules} /></div>
      </div>
      {company.childCompanies.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <p className="text-foreground font-medium mb-3">Child Companies</p>
          <div className="space-y-2">
            {company.childCompanies.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <Link href={`/platform/companies/${c.id}`} className="text-indigo-400 hover:text-indigo-300 transition">{c.name}</Link>
                <span className="text-muted-foreground text-xs">{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <DeleteCompanyDialog companyId={company.id} companyName={company.name} />
    </div>
  );
}
