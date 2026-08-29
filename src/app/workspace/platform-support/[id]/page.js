import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getCompanyTicket } from "@/lib/platform/actions/supportTickets";
import ForbiddenState from "@/components/shared/ForbiddenState";
import PlatformSupportTicketDetail from "@/components/workspace/platformSupport/PlatformSupportTicketDetail";

export default async function PlatformSupportTicketPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!isSuperAdmin(session)) return <ForbiddenState />;
  const ticket = await getCompanyTicket(session, id);
  return <PlatformSupportTicketDetail initialTicket={ticket} />;
}
