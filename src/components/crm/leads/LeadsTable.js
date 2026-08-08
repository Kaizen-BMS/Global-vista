"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Eye, Phone, Mail, Contact2 } from "lucide-react";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import EmptyState from "@/components/shared/EmptyState";
import DataTable from "@/components/shared/DataTable";
import { apiFetch } from "@/components/shared/apiClient";

export default function LeadsTable({ leads, canBulkAssign, canBulkUpdate, sortKey = "created_at", sortDir = "DESC" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleSelect(id) { setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])); }
  function toggleAll() { setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id)); }

  function handleSort(key) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("dir", sortKey === key && sortDir === "ASC" ? "DESC" : "ASC");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function bulkSetStatus(status) {
    setBulkBusy(true);
    try {
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "status", ids: selected, status }) });
      if (!res.ok) throw new Error();
      toast.success(`${selected.length} leads updated.`);
      setSelected([]); router.refresh();
    } catch { toast.error("Bulk update failed."); } finally { setBulkBusy(false); }
  }

  if (leads.length === 0) return <EmptyState icon={Contact2} title="No leads found" description="Try adjusting your filters or add a new lead." />;

  const columns = [
    { key: "lead_number", label: "Lead #", width: 110, render: (l) => <span className="text-muted-foreground text-xs">{l.lead_number}</span> },
    {
      key: "name", label: "Name", width: 200, sortable: true, hideable: false,
      render: (l) => (
        <span className="flex items-center gap-2 min-w-0">
          <Link href={`/workspace/lead-management/${l.id}`} className="text-foreground hover:text-indigo-400 font-medium truncate">{l.name}</Link>
          {l.is_duplicate ? <span className="text-[10px] text-orange-400 shrink-0">DUPLICATE</span> : null}
        </span>
      ),
    },
    { key: "phone", label: "Phone", width: 140, render: (l) => l.phone },
    { key: "country", label: "Country", width: 120, render: (l) => l.country || "—" },
    { key: "source_name", label: "Source", width: 130, render: (l) => l.source_name },
    { key: "assigned_name", label: "Assigned", width: 140, render: (l) => l.assigned_name || "Unassigned" },
    { key: "stage", label: "Stage", width: 130, sortable: true, render: (l) => <StageBadge stage={l.stage} /> },
    { key: "priority", label: "Priority", width: 110, sortable: true, render: (l) => <PriorityBadge priority={l.priority} /> },
  ];

  return (
    <div>
      {selected.length > 0 && (canBulkAssign || canBulkUpdate) && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-sm">
          <span className="text-indigo-300">{selected.length} selected</span>
          {canBulkUpdate && (<>
            <button disabled={bulkBusy} onClick={() => bulkSetStatus("Hold")} className="text-foreground hover:text-foreground">Hold</button>
            <button disabled={bulkBusy} onClick={() => bulkSetStatus("Denied")} className="text-foreground hover:text-foreground">Deny</button>
          </>)}
        </div>
      )}

      <div className="hidden md:block">
        <DataTable
          tableId="leads"
          columns={columns}
          rows={leads}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(l) => router.push(`/workspace/lead-management/${l.id}`)}
          leadingColumn={{
            width: 36,
            headerRender: () => <input type="checkbox" checked={selected.length === leads.length} onChange={toggleAll} onClick={(e) => e.stopPropagation()} className="cursor-pointer" />,
            render: (l) => <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} className="cursor-pointer" />,
          }}
          rowContextMenuItems={(l) => [
            { label: "View Details", icon: Eye, onClick: () => router.push(`/workspace/lead-management/${l.id}`) },
            { label: "Call", icon: Phone, onClick: () => { window.location.href = `tel:${l.phone}`; } },
            ...(l.email ? [{ label: "Email", icon: Mail, onClick: () => { window.location.href = `mailto:${l.email}`; } }] : []),
          ]}
        />
      </div>

      <div className="md:hidden space-y-3">
        {leads.map((lead) => (
          <Link key={lead.id} href={`/workspace/lead-management/${lead.id}`} className="block bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-foreground font-medium">{lead.name}</p>
              <PriorityBadge priority={lead.priority} />
            </div>
            <p className="text-muted-foreground text-xs mb-2">{lead.lead_number} · {lead.phone}</p>
            <div className="flex items-center justify-between">
              <StageBadge stage={lead.stage} />
              <span className="text-muted-foreground text-xs">{lead.assigned_name || "Unassigned"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
