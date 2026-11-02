import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { listConversations, listMessageableUsers } from "@/lib/actions/messaging";
import { listChildCompanies } from "@/lib/actions/companySwitch";
import MessagingApp from "@/components/messaging/MessagingApp";

export default async function MessagesPage() {
  const session = await getSession();
  const [conversations, messageableUsers, childCompanies, parentCompany] = await Promise.all([
    listConversations(session),
    listMessageableUsers(session),
    session.can_create_child_companies ? listChildCompanies(session) : [],
    session.is_child_company && session.parent_company_id
      ? pool.query(`SELECT name FROM companies WHERE id = ?`, [session.parent_company_id]).then(([rows]) => rows[0]?.name || null)
      : null,
  ]);
  return (
    <MessagingApp
      currentUserId={session.id}
      isSuperAdmin={isSuperAdmin(session)}
      initialConversations={conversations}
      messageableUsers={messageableUsers}
      canSeeExternal={!!session.can_create_child_companies || (session.is_child_company && session.role_slug === "super-admin")}
      childCompanies={childCompanies}
      parentCompanyName={parentCompany}
      isChildCompany={!!session.is_child_company}
    />
  );
}
