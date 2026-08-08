import Link from "next/link";
import { Pencil } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getLeadFormAnalytics } from "@/lib/modules/crm/actions/leadForms";
import { getSettingsByGroup } from "@/lib/actions/settings";
import ForbiddenState from "@/components/shared/ForbiddenState";
import WorkspaceNotFound from "@/app/workspace/not-found";
import LeadFormShareCard from "@/components/crm/forms/LeadFormShareCard";
import LeadFormAnalytics from "@/components/crm/forms/LeadFormAnalytics";

export default async function LeadFormDetailPage({ params }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const { id } = await params;
  const [analytics, canEdit, systemSettings] = await Promise.all([getLeadFormAnalytics(session, id), can(session, "leads.update"), getSettingsByGroup(session, "system")]);
  if (!analytics) return <WorkspaceNotFound />;
  const timezone = systemSettings.timezone || "UTC";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{analytics.form.name}</h1>
          {analytics.form.description && <p className="text-muted-foreground text-sm mt-0.5">{analytics.form.description}</p>}
        </div>
        {canEdit && (
          <Link href={`/workspace/lead-forms/${id}/edit`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm transition cursor-pointer">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <LeadFormAnalytics analytics={analytics} timezone={timezone} />
        </div>
        <div>
          <LeadFormShareCard slug={analytics.form.slug} formId={id} />
        </div>
      </div>
    </div>
  );
}
