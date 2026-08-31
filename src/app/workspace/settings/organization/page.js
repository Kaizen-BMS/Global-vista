import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getCompanyBranding } from "@/lib/actions/companyBranding";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { listOrgRecords } from "@/lib/actions/orgSettings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import ForbiddenState from "@/components/shared/ForbiddenState";
import CompanyBrandingSettingsForm from "@/components/forms/CompanyBrandingSettingsForm";
import SettingsForm from "@/components/forms/SettingsForm";
import ManagedListEditor from "@/components/forms/ManagedListEditor";

export default async function OrganizationalSettingPage() {
  const session = await getSession();
  if (!isSuperAdmin(session)) return <ForbiddenState />;

  const [branding, notificationValues, emailValues, callingValues, branches, departments, designations, employeeTypes] = await Promise.all([
    getCompanyBranding(session),
    getSettingsByGroup(session, "notifications"),
    getSettingsByGroup(session, "email"),
    getSettingsByGroup(session, "calling"),
    listOrgRecords(session, "branches"), listOrgRecords(session, "departments"),
    listOrgRecords(session, "designations"), listOrgRecords(session, "employee-types"),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1 whitespace-nowrap">Organizational Setting</h1>
      <SettingsTabs />
      <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
        Everything about how your company is set up — branding, who gets notified about what, and your org structure.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-foreground font-medium mb-1">Branding</h2>
          <p className="text-muted-foreground text-sm mb-3 max-w-2xl">
            Your logo, colors, and contact details appear across the sidebar, reports, and outgoing emails — the moment you save, the whole workspace reflects it.
          </p>
          <CompanyBrandingSettingsForm initial={branding} />
        </section>

        <section>
          <h2 className="text-foreground font-medium mb-1">Notifications</h2>
          <p className="text-muted-foreground text-sm mb-3 max-w-2xl">
            Turn a category off to stop it being created for anyone in this company — not just hide it, it's never sent.
          </p>
          <SettingsForm
            group="notifications"
            initialValues={notificationValues}
            fields={[
              { key: "notify_leads", label: "Leads & Follow-ups", type: "toggle", hint: "New leads, assignments, status changes, follow-ups, meetings." },
              { key: "notify_tasks", label: "Tasks", type: "toggle", hint: "Task assignments and completions." },
              { key: "notify_documents", label: "Documents", type: "toggle", hint: "New uploads and reminders for missing/pending documents." },
              { key: "notify_payments", label: "Payments & Billing", type: "toggle", hint: "Payments received/failed, subscription changes." },
              { key: "notify_messages", label: "Messages", type: "toggle", hint: "New direct and group messages." },
              { key: "notify_support", label: "Support & Feedback", type: "toggle", hint: "Complaints and ideas activity." },
              { key: "notify_account", label: "Account & Team", type: "toggle", hint: "New employees, role changes, company profile updates." },
            ]}
          />
        </section>

        <section>
          <h2 className="text-foreground font-medium mb-1">Calling Integration</h2>
          <p className="text-muted-foreground text-sm mb-3 max-w-2xl">
            Connect your own Exotel account so employees can call a lead straight from the lead page — Exotel rings your
            employee's phone first, then bridges to the lead's number, and records both sides so you can verify a call
            actually happened. This uses your company's own Exotel account and its own per-minute billing; no calling
            cost is charged by this platform. Find these values on your Exotel dashboard under Settings → API Credentials.
          </p>
          <SettingsForm
            group="calling"
            initialValues={callingValues}
            fields={[
              {
                key: "calling_enabled", label: "Call Recording", type: "toggle",
                hint: "Turn off anytime to stop employees from placing new calls — this pauses the feature without losing your saved Exotel credentials below, since every call is billed by Exotel to your account, not by this platform.",
              },
              {
                key: "calling_provider", label: "Provider", type: "select",
                options: [
                  { value: "", label: "Not connected" },
                  { value: "exotel", label: "Exotel" },
                ],
              },
              { key: "exotel_sid", label: "Account SID" },
              { key: "exotel_api_key", label: "API Key" },
              { key: "exotel_api_token", label: "API Token", type: "password" },
              { key: "exotel_exophone", label: "Exophone (Caller ID)", hint: "The virtual number purchased in your Exotel account, used as the caller ID for both call legs." },
              { key: "exotel_api_base", label: "API Base URL (optional)", hint: "Only needed if your Exotel dashboard shows a regional API domain other than https://api.exotel.com." },
            ]}
          />
        </section>

        <section>
          <h2 className="text-foreground font-medium mb-1">Email</h2>
          <p className="text-muted-foreground text-sm mb-3 max-w-2xl">
            The SMTP server outgoing emails (invites, receipts, notifications) are sent through.
          </p>
          <SettingsForm
            group="email"
            initialValues={emailValues}
            fields={[
              { key: "smtp_host", label: "SMTP Host" },
              { key: "smtp_port", label: "SMTP Port" },
              { key: "smtp_from_name", label: "From Name" },
            ]}
          />
        </section>

        <section>
          <h2 className="text-foreground font-medium mb-3">Organization Structure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ManagedListEditor title="Branches" apiBase="/api/core/organization/branches" items={branches} />
            <ManagedListEditor title="Departments" apiBase="/api/core/organization/departments" items={departments} />
            <ManagedListEditor title="Designations" apiBase="/api/core/organization/designations" items={designations} />
            <ManagedListEditor title="Employee Types" apiBase="/api/core/organization/employee-types" items={employeeTypes} />
          </div>
        </section>
      </div>
    </div>
  );
}
