import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/actions/users";
import { getCompanyBranding } from "@/lib/actions/companyBranding";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { Mail, Phone, Building2, Users as UsersIcon, Briefcase, UserCog, CalendarDays, ShieldCheck, KeyRound } from "lucide-react";
import SessionsPanel from "@/components/profile/SessionsPanel";
import EmployeeDocumentsPanel from "@/components/users/EmployeeDocumentsPanel";
import ProfileThemeControl from "@/components/profile/ProfileThemeControl";

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-2 first:pt-0 last:pb-0">
      <span className="flex items-center gap-2 text-muted-foreground text-xs shrink-0"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="text-foreground text-right truncate">{value}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await getSession();
  const [user, branding] = await Promise.all([getUserById(session, session.id), getCompanyBranding(session)]);
  const admin = isSuperAdmin(session);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header — avatar, name, role, quick identity */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="h-16 w-16 shrink-0 rounded-full bg-indigo-600/10 border border-indigo-600/30 flex items-center justify-center text-indigo-400 text-2xl font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground">{user.name}</h1>
            {admin && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-gold/40 bg-gold/10 text-gold"><ShieldCheck className="h-3 w-3" /> Super Admin</span>}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{user.role_name} {user.employee_id ? `· ${user.employee_id}` : ""}</p>
        </div>
        <Link href="/workspace/change-password" className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-muted border border-border text-foreground text-sm font-medium hover:border-indigo-500/40 hover:bg-indigo-500/5 transition cursor-pointer">
          <KeyRound className="h-3.5 w-3.5" /> Change Password
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee information — real data only, whatever's actually set */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-foreground font-medium mb-3">Employee Information</p>
          <div className="divide-y divide-border">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Phone" value={user.phone} />
            <InfoRow icon={Building2} label="Branch" value={user.branch_name} />
            <InfoRow icon={UsersIcon} label="Department" value={user.department_name} />
            <InfoRow icon={Briefcase} label="Designation" value={user.designation_name} />
            <InfoRow icon={UserCog} label="Reporting Manager" value={user.manager_name} />
            <InfoRow icon={CalendarDays} label="Joined" value={user.joining_date ? new Date(user.joining_date).toLocaleDateString() : null} />
          </div>
        </div>

        {/* Company information — read-only context, from real branding/company data */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-foreground font-medium mb-3">Company</p>
          <div className="flex items-center gap-3 mb-3">
            {branding.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={branding.logoUrl} alt={branding.name} className="h-9 w-9 rounded-lg object-contain border border-border bg-white" />
            ) : (
              <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ backgroundColor: "var(--brand-primary, #4f46e5)" }}>{branding.name?.charAt(0) || "C"}</div>
            )}
            <p className="text-foreground text-sm font-medium truncate">{branding.name}</p>
          </div>
          <div className="divide-y divide-border">
            <InfoRow icon={Mail} label="Contact Email" value={branding.contactEmail} />
            <InfoRow icon={Phone} label="Contact Phone" value={branding.contactPhone} />
            <InfoRow icon={Building2} label="Currency" value={branding.currency} />
          </div>
        </div>
      </div>

      {/* Preferences — the one real, working preference this app has is appearance */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-foreground font-medium mb-1">Preferences</p>
        <p className="text-muted-foreground text-xs mb-4">Your appearance choice is saved to this device.</p>
        <ProfileThemeControl />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-foreground font-medium mb-3">Security</p>
        <SessionsPanel />
      </div>

      <div>
        <h2 className="text-foreground font-medium mb-3">My Documents</h2>
        <EmployeeDocumentsPanel userId={session.id} isSelf />
      </div>
    </div>
  );
}
