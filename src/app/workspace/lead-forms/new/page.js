import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { listLeadCustomFields } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadFormBuilder from "@/components/crm/forms/LeadFormBuilder";

export default async function NewLeadFormPage() {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return <ForbiddenState />;

  const schemaReady = await hasLeadCustomFieldsSchema();
  const [sources, services, usersResult, customFields] = await Promise.all([
    listLeadSources(session), listServices(session), listUsers(session, { status: "active", pageSize: 100 }),
    schemaReady ? listLeadCustomFields(session, { activeOnly: true, context: "query_form" }) : [],
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Create Query Form</h1>
      <p className="text-muted-foreground text-sm mb-6">Build a public form — anyone with the link or QR code can submit it, no login required.</p>
      <LeadFormBuilder sources={sources} services={services} users={usersResult.users} customFields={customFields} />
    </div>
  );
}
