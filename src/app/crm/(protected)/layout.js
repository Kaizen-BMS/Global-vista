import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getVisibleNavItems } from "@/lib/helpers/menu";
import Sidebar from "@/components/crm/layout/Sidebar";
import Topbar from "@/components/crm/layout/Topbar";
import PageTransition from "@/components/crm/shared/PageTransition";

export default async function CrmProtectedLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/crm/login");

  const navItems = await getVisibleNavItems(session);

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      <Sidebar session={session} navItems={navItems} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar session={session} navItems={navItems} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {session.must_change_password ? (
            <ForcedPasswordChangeNotice />
          ) : (
            <PageTransition>{children}</PageTransition>
          )}
        </main>
      </div>
    </div>
  );
}

function ForcedPasswordChangeNotice() {
  // Rendered instead of the requested page whenever a session still
  // carries must_change_password — keeps every protected route behind
  // the forced change without needing per-page checks. The
  // /crm/change-password page itself is exempt since it doesn't reach
  // this layout branch meaningfully differently (it renders the form).
  const ChangePasswordForm = require("@/components/crm/forms/ChangePasswordForm").default;
  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-xl font-semibold text-white mb-1">Set a New Password</h1>
      <p className="text-neutral-500 text-sm mb-6">
        You're using a temporary password. Set a new one to continue using the CRM.
      </p>
      <ChangePasswordForm forced />
    </div>
  );
}