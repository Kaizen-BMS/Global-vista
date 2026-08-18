import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { listComplaints, getComplaintStats, COMPLAINT_CATEGORIES } from "@/lib/actions/complaints";
import { hasComplaintsSchema } from "@/lib/db/schemaFlags";
import ComplaintsWorkspace from "@/components/workspace/complaints/ComplaintsWorkspace";

export default async function ComplaintsPage() {
  const session = await getSession();
  const schemaReady = await hasComplaintsSchema();
  const admin = isSuperAdmin(session);

  const [complaints, stats] = schemaReady
    ? await Promise.all([listComplaints(session, {}), admin ? getComplaintStats(session) : null])
    : [[], null];

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">{admin ? "Complaint Center" : "Complaints"}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {admin ? "Review and resolve every complaint raised across your team." : "Raise a concern and track it through to resolution."}
      </p>
      {!schemaReady ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          The complaints feature is being set up for your workspace. Check back shortly.
        </div>
      ) : (
        <ComplaintsWorkspace initialComplaints={complaints} initialStats={stats} isSuperAdmin={admin} categories={COMPLAINT_CATEGORIES} />
      )}
    </div>
  );
}
