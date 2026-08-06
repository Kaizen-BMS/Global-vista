"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Open: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  Assigned: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  Hold: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  Denied: "bg-red-500/10 text-red-400 border-red-500/30",
  Converted: "bg-green-500/10 text-green-400 border-green-500/30",
};

export default function LeadsTable({ leads }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(null);

  async function updateStatus(id, status) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lead updated.");
      router.refresh();
    } catch {
      toast.error("Failed to update lead.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-800">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Assigned</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Duplicate</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-neutral-800/60">
              <td className="px-4 py-3 text-white">{lead.name}</td>
              <td className="px-4 py-3 text-neutral-300">{lead.phone}</td>
              <td className="px-4 py-3 text-neutral-300">{lead.source_name}</td>
              <td className="px-4 py-3 text-neutral-300">{lead.service_name}</td>
              <td className="px-4 py-3 text-neutral-300">{lead.assigned_name || "—"}</td>
              <td className="px-4 py-3">
                <select
                  value={lead.status}
                  disabled={updating === lead.id}
                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                  className={`text-xs px-2 py-1 rounded-md border bg-transparent ${STATUS_COLORS[lead.status]}`}
                >
                  {Object.keys(STATUS_COLORS).map((s) => (
                    <option key={s} value={s} className="bg-neutral-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                {lead.is_duplicate ? (
                  <span className="text-xs text-orange-400">Yes</span>
                ) : (
                  <span className="text-xs text-neutral-600">No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}