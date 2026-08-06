import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPlatformOperator } from "@/lib/helpers/permissions";
import { getVisibleNavItems } from "@/lib/helpers/menu";
import { getCurrentCompany } from "@/lib/platform/tenant";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import PageTransition from "@/components/shared/PageTransition";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";

export default async function WorkspaceLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isPlatformOperator(session)) redirect("/platform");
  const [navItems, company] = await Promise.all([getVisibleNavItems(session), getCurrentCompany(session.company_id)]);

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      <Sidebar session={session} navItems={navItems} company={company} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar company={company} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {session.must_change_password ? <div className="max-w-md mx-auto mt-12"><h1 className="text-xl font-semibold text-white mb-1">Set a New Password</h1><ChangePasswordForm forced /></div> : <PageTransition>{children}</PageTransition>}
        </main>
      </div>
    </div>
  );
}