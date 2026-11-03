import { GraduationCap } from "lucide-react";

/** `logoUrl` is Global Vista Educators' own logo (getCompanyBranding
 * already resolves a school's sidebarLogoUrl/logoUrl to the PARENT's own
 * branding, same as the real sidebar) — falls back to the generic icon
 * only if no logo has ever been set at all. `parentCompanyName` is GVE's
 * own name (session.parent_company_id's own record) — shown alongside
 * the logo, not just the image on its own, same "part of X" wording the
 * ChildCompanyBanner already uses elsewhere. */
export default function SchoolBanner({ companyName, logoUrl, parentCompanyName }) {
  return (
    <div className="relative overflow-hidden rounded-xl mb-6 p-6 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute right-16 bottom-0 h-20 w-20 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-3">
        <div className="h-11 w-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
          {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" /> : <GraduationCap className="h-6 w-6 text-white" />}
        </div>
        <div>
          <p className="text-white text-lg font-semibold truncate">{companyName}</p>
          <p className="text-white/70 text-xs">{parentCompanyName ? `Part of ${parentCompanyName}` : "School Dashboard"}</p>
        </div>
      </div>
    </div>
  );
}
