import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getLeadForm } from "@/lib/modules/crm/actions/leadForms";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import ForbiddenState from "@/components/shared/ForbiddenState";
import WorkspaceNotFound from "@/app/workspace/not-found";
import LeadFormBuilder from "@/components/crm/forms/LeadFormBuilder";

export default async function EditLeadFormPage({ params }) {
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return <ForbiddenState />;

  const { id } = await params;
  const [form, sources, services, usersResult] = await Promise.all([
    getLeadForm(session, id), listLeadSources(session), listServices(session), listUsers(session, { status: "active", pageSize: 100 }),
  ]);
  if (!form) return <WorkspaceNotFound />;

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
      <h1 className="text-xl font-semibold text-white mb-1">Edit Lead Form</h1>
      <p className="text-neutral-500 text-sm mb-6">/forms/{form.slug}</p>
      <LeadFormBuilder sources={sources} services={services} users={usersResult.users} initialData={initialData} formId={form.id} />
    </div>
  );
}
