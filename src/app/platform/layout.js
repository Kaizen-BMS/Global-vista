import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPlatformOperator } from "@/lib/helpers/permissions";
import { PLATFORM_NAV_ITEMS } from "@/lib/constants/navItems";
import Sidebar from "@/components/layout/Sidebar";
import PlatformTopbar from "@/components/layout/PlatformTopbar";
import PageTransition from "@/components/shared/PageTransition";
import { MobileNavProvider } from "@/components/layout/MobileNavContext";

// Global Vista's own identity, not a tenant's — deliberately not
// pulled from the companies table, per the branding rule that Global
// Vista branding belongs only in Platform Admin/Login/Marketing/Billing.
const PLATFORM_IDENTITY = { name: "Global Vista", short_name: "Platform Console", primary_color: "#4f46e5" };

export default async function PlatformLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isPlatformOperator(session)) redirect("/workspace/dashboard");

  return (
    <MobileNavProvider>
      <div className="h-screen bg-black flex overflow-hidden">
        <Sidebar session={session} navItems={PLATFORM_NAV_ITEMS} company={PLATFORM_IDENTITY} showPoweredBy={false} scope="platform" />
        <div className="flex-1 flex flex-col min-w-0">
          <PlatformTopbar session={session} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-[1600px] mx-auto w-full">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
