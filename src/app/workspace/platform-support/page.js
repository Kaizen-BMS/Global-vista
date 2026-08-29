import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { listCompanyTickets, SUPPORT_TICKET_CATEGORIES } from "@/lib/platform/actions/supportTickets";
import { hasPlatformSupportSchema } from "@/lib/db/schemaFlags";
import PlatformSupportWorkspace from "@/components/workspace/platformSupport/PlatformSupportWorkspace";

export default async function PlatformSupportPage() {
  const session = await getSession();
  const admin = isSuperAdmin(session);
  const schemaReady = await hasPlatformSupportSchema();
  const tickets = schemaReady && admin ? await listCompanyTickets(session) : [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Platform Support</h1>
      {!schemaReady ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm mt-4">
          Platform Support is being set up. Check back shortly.
        </div>
      ) : (
        <div className="mt-4">
          <PlatformSupportWorkspace initialTickets={tickets} categories={SUPPORT_TICKET_CATEGORIES} canManage={admin} />
        </div>
      )}
    </div>
  );
}
