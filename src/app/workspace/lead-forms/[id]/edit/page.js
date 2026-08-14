import { getSession } from "@/lib/auth";
import { can, isSuperAdmin } from "@/lib/helpers/permissions";
import { getLeadForm } from "@/lib/modules/crm/actions/leadForms";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { listLeadCustomFields } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import ForbiddenState from "@/components/shared/ForbiddenState";
import WorkspaceNotFound from "@/app/workspace/not-found";
import LeadFormBuilder from "@/components/crm/forms/LeadFormBuilder";

export default async function EditLeadFormPage({ params }) {
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return <ForbiddenState />;

  const { id } = await params;
  const schemaReady = await hasLeadCustomFieldsSchema();
  const [form, sources, services, usersResult, customFields] = await Promise.all([
    getLeadForm(session, id), listLeadSources(session), listServices(session), listUsers(session, { status: "active", pageSize: 100 }),
    schemaReady ? listLeadCustomFields(session, { activeOnly: true, context: "query_form" }) : [],
  ]);
  if (!form) return <WorkspaceNotFound />;
  // Same creator-or-Super-Admin rule the PUT/DELETE API enforces — this page
  // gate is UX only, the API route is the real authorization boundary.
  const isOwner = form.created_by && Number(form.created_by) === Number(session.id);
  if (!isOwner && !isSuperAdmin(session)) return <ForbiddenState />;

  const initialData = {
    name: form.name, description: form.description || "", fields: form.fields_config,
    defaultLeadSourceId: form.default_lead_source_id || "", defaultServiceId: form.default_service_id || "",
    defaultAssignedTo: form.default_assigned_to || "", defaultTags: form.default_tags || "",
    campaign: form.campaign || "", successMessage: form.success_message || "", redirectUrl: form.redirect_url || "",
    notifyEmails: form.notify_emails || "", recaptchaEnabled: !!form.recaptcha_enabled, status: form.status,
    theme: form.theme_config,
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Edit Query Form</h1>
      <p className="text-muted-foreground text-sm mb-6">/forms/{form.slug}</p>
      <LeadFormBuilder sources={sources} services={services} users={usersResult.users} initialData={initialData} formId={form.id} customFields={customFields} />
    </div>
  );
}
