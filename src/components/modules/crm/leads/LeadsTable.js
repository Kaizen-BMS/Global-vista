"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import EmptyState from "@/components/crm/shared/EmptyState";
import { Contact2 } from "lucide-react";

export default function LeadsTable({ leads, canBulkAssign, canBulkUpdate }) {
  const router = useRouter();
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id));
  }

  async function bulkSetStatus(status) {
    setBulkBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkAction: "status", ids: selected, status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selected.length} leads updated.`);
      setSelected([]);
      router.refresh();
    } catch {
      toast.error("Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  if (leads.length === 0) {
    return <EmptyState icon={Contact2} title="No leads found" description="Try adjusting your filters or add a new lead." />;
  }

  return (
    <div>
      {selected.length > 0 && (canBulkAssign || canBulkUpdate) && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-sm">
          <span className="text-indigo-300">{selected.length} selected</span>
          {canBulkUpdate && (
            <>
              <button disabled={bulkBusy} onClick={() => bulkSetStatus("Hold")} className="text-neutral-300 hover:text-white">Hold</button>
              <button disabled={bulkBusy} onClick={() => bulkSetStatus("Denied")} className="text-neutral-300 hover:text-white">Deny</button>
            </>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={selected.length === leads.length} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3">Lead #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Priority</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} />
                </td>
                <td className="px-4 py-3 text-neutral-400 text-xs">{lead.lead_number}</td>
                <td className="px-4 py-3">
                  <Link href={`/crm/lead-management/${lead.id}`} className="text-white hover:text-indigo-400 font-medium">
                    {lead.name}
                  </Link>
                  {lead.is_duplicate ? <span className="ml-2 text-[10px] text-orange-400">DUPLICATE</span> : null}
                </td>
                <td className="px-4 py-3 text-neutral-300">{lead.phone}</td>
                <td className="px-4 py-3 text-neutral-300">{lead.country || "—"}</td>
                <td className="px-4 py-3 text-neutral-300">{lead.source_name}</td>
                <td className="px-4 py-3 text-neutral-300">{lead.assigned_name || "Unassigned"}</td>
                <td className="px-4 py-3"><StageBadge stage={lead.stage} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={lead.priority} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/crm/lead-management/${lead.id}`}
            className="block bg-neutral-900 border border-neutral-800 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-medium">{lead.name}</p>
              <PriorityBadge priority={lead.priority} />
            </div>
            <p className="text-neutral-400 text-xs mb-2">{lead.lead_number} · {lead.phone}</p>
            <div className="flex items-center justify-between">
              <StageBadge stage={lead.stage} />
              <span className="text-neutral-500 text-xs">{lead.assigned_name || "Unassigned"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}