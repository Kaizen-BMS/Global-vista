import Link from "next/link";
import { Plus, ExternalLink, Eye, ScanLine, Contact2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadForms } from "@/lib/modules/crm/actions/leadForms";
import ForbiddenState from "@/components/shared/ForbiddenState";
import EmptyState from "@/components/shared/EmptyState";

const STATUS_STYLES = { active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", inactive: "bg-muted/20 text-muted-foreground border-border/30" };

export default async function LeadFormsPage() {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;
  const [forms, canCreate] = await Promise.all([listLeadForms(session), can(session, "leads.create")]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lead Forms</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Public forms that turn into leads automatically — share the link, print the QR code, or embed it anywhere.</p>
        </div>
        {canCreate && (
          <Link href="/workspace/lead-forms/new" className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer">
            <Plus className="h-4 w-4" /> Create Form
          </Link>
        )}
      </div>

      {forms.length === 0 ? (
        <EmptyState icon={Contact2} title="No lead forms yet" description="Create your first public form to start capturing leads without manual entry." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((f) => (
            <Link key={f.id} href={`/workspace/lead-forms/${f.id}`} className="block bg-card border border-border rounded-xl p-5 hover:border-border hover:-translate-y-0.5 transition cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <p className="text-foreground font-medium truncate pr-2">{f.name}</p>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md border ${STATUS_STYLES[f.status]}`}>{f.status}</span>
              </div>
              <p className="text-muted-foreground text-xs truncate mb-4">/forms/{f.slug}</p>
              <div className="flex items-center gap-4 text-muted-foreground text-xs">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {f.view_count} views</span>
                <span className="flex items-center gap-1"><ScanLine className="h-3.5 w-3.5" /> {f.submission_count} leads</span>
                <ExternalLink className="h-3.5 w-3.5 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
