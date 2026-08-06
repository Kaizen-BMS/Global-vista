import { getCompanyBranding } from "@/lib/actions/companyBranding";

export default async function ReportPrintHeader({ session, title, subtitle }) {
  const branding = await getCompanyBranding(session);
  return (
    <div className="hidden print:flex items-center justify-between border-b border-black pb-3 mb-4">
      {branding.watermarkLogoUrl && (
        <img src={branding.watermarkLogoUrl} alt="" className="hidden print:block fixed top-1/3 left-1/2 -translate-x-1/2 w-64 opacity-10 -z-10" />
      )}
      <div className="flex items-center gap-3">
        {branding.logoUrl && <img src={branding.logoUrl} alt="" className="h-10 w-10 object-contain" />}
        <div>
          <p className="text-black font-semibold text-base">{branding.name || "Company"}</p>
          {branding.footerText && <p className="text-neutral-600 text-xs">{branding.footerText}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className="text-black font-medium text-sm">{title}</p>
        {subtitle && <p className="text-neutral-600 text-xs">{subtitle}</p>}
        <p className="text-neutral-500 text-xs">Generated {new Date().toLocaleString()} by {session?.name || "—"}</p>
      </div>
    </div>
  );
}
