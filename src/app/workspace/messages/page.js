import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { listConversations, listMessageableUsers } from "@/lib/actions/messaging";
import MessagingApp from "@/components/messaging/MessagingApp";

export default async function MessagesPage() {
  const session = await getSession();
  const [conversations, messageableUsers] = await Promise.all([listConversations(session), listMessageableUsers(session)]);
  return (
    <MessagingApp
      currentUserId={session.id}
      isSuperAdmin={isSuperAdmin(session)}
      initialConversations={conversations}
      messageableUsers={messageableUsers}
    />
  );
}
