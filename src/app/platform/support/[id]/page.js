import { getSession } from "@/lib/auth";
import { getTicketForOperator } from "@/lib/platform/actions/supportTickets";
import SupportTicketDetail from "@/components/platform/support/SupportTicketDetail";

export default async function PlatformSupportTicketDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  const ticket = await getTicketForOperator(session, id);
  return <SupportTicketDetail initialTicket={ticket} currentUserId={session.id} />;
}
