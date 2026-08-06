import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeads } from "@/lib/actions/leads";
import ForbiddenState from "@/components/shared/ForbiddenState";
import EmptyState from "@/components/shared/EmptyState";
import { Contact2 } from "lucide-react";

export default async function LeadManagementPage() {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;
  const result = await listLeads(session);
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-6">Leads ({result.total})</h1>
      {result.leads.length === 0 ? <EmptyState icon={Contact2} title="No leads yet" /> : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="text-left text-neutral-500 border-b border-neutral-800"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>{result.leads.map((l) => <tr key={l.id} className="border-b border-neutral-800/60"><td className="px-4 py-3 text-white">{l.name}</td><td className="px-4 py-3 text-neutral-300">{l.phone}</td><td className="px-4 py-3 text-neutral-300">{l.source_name}</td><td className="px-4 py-3 text-neutral-300">{l.status}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
}