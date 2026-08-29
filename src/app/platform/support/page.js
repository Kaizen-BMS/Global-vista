import { getSession } from "@/lib/auth";
import { listAllTickets, getSupportTicketStats } from "@/lib/platform/actions/supportTickets";
import { hasPlatformSupportSchema } from "@/lib/db/schemaFlags";
import SupportTicketsList from "@/components/platform/support/SupportTicketsList";

export default async function PlatformSupportTicketsPage() {
  const session = await getSession();
  const schemaReady = await hasPlatformSupportSchema();
  const [tickets, stats] = schemaReady
    ? await Promise.all([listAllTickets(session), getSupportTicketStats(session)])
    : [[], { total: 0, open: 0, highPriority: 0, inProgress: 0, resolved: 0 }];

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold text-foreground">Support Tickets</h1>
      <p className="text-muted-foreground text-sm mb-4">Every ticket raised by a company across the whole platform.</p>
      {!schemaReady ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          Platform Support is being set up. Check back shortly.
        </div>
      ) : (
        <SupportTicketsList initialTickets={tickets} initialStats={stats} />
      )}
    </div>
  );
}
