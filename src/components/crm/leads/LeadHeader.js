"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Pencil, Phone, Mail, MessageCircle, MoreHorizontal, UserCog, UploadCloud, Wallet,
} from "lucide-react";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import LeadScoreBadge from "@/components/crm/badges/LeadScoreBadge";
import { TakeLeadButton, ReleaseLeadButton, AssignToPicker } from "@/components/crm/leads/LeadAssignmentAction";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

function IconAction({ href, icon: Icon, label, disabled }) {
  if (disabled) return null;
  return (
    <a href={href} title={label} className="hidden sm:flex items-center justify-center h-8 w-8 rounded-lg bg-card border border-border text-foreground hover:border-indigo-500/40 hover:bg-indigo-500/5 transition cursor-pointer">
      <Icon className="h-3.5 w-3.5" />
    </a>
  );
}

function MoreActionsMenu({ lead, leadId, canEdit, canManageAssignment, canManageDocs, paymentsEnabled, employees, assignedTo }) {
  const [open, setOpen] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowAssign(false); } }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="More actions" aria-expanded={open} className="flex items-center justify-center h-8 w-8 rounded-lg bg-card border border-border text-foreground hover:bg-muted cursor-pointer transition">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="sm:hidden border-b border-border">
            {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition"><Phone className="h-3.5 w-3.5" /> Call</a>}
            {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition"><Mail className="h-3.5 w-3.5" /> Email</a>}
            {(lead.whatsapp || lead.phone) && <a href={`https://wa.me/${(lead.whatsapp || lead.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
          </div>
          {canEdit && (
            <Link href={`/workspace/lead-management/${leadId}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition">
              <Pencil className="h-3.5 w-3.5" /> Edit Lead
            </Link>
          )}
          {canManageAssignment && (
            <button onClick={() => setShowAssign((s) => !s)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition cursor-pointer">
              <UserCog className="h-3.5 w-3.5" /> Assign to…
            </button>
          )}
          {showAssign && canManageAssignment && <AssignToPicker leadId={leadId} employees={employees} currentAssignedTo={assignedTo} onDone={() => { setShowAssign(false); setOpen(false); }} />}
          {canManageDocs && (
            <button onClick={() => scrollTo("documents")} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition cursor-pointer">
              <UploadCloud className="h-3.5 w-3.5" /> Upload Document
            </button>
          )}
          {paymentsEnabled && (
            <button onClick={() => scrollTo("payments")} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition cursor-pointer">
              <Wallet className="h-3.5 w-3.5" /> Record Payment
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AssignedChip({ lead, leadId, session, canEdit, canManageAssignment }) {
  if (!lead.assigned_to) {
    return canEdit ? <TakeLeadButton leadId={leadId} /> : (
      <span className="px-2.5 py-1 rounded-md text-xs bg-muted text-muted-foreground">Unassigned</span>
    );
  }
  const mine = lead.assigned_to === session.id;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs" title="Assigned to">
      <span className="text-foreground truncate max-w-36">{lead.assigned_name}</span>
      {(mine || canManageAssignment) && <ReleaseLeadButton leadId={leadId} />}
    </div>
  );
}

export default function LeadHeader({ lead, leadId, score, tags, session, canEdit, canManageAssignment, canManageDocs, paymentsEnabled, employees }) {
  const timezone = useTimezone();
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-11 w-11 shrink-0 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-base font-semibold">
            {lead.name?.trim()?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground truncate">{lead.name}</h1>
              <span className="text-muted-foreground text-xs">{lead.lead_number}</span>
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5 truncate">
              {lead.created_at && formatDateTime(lead.created_at, timezone)}{lead.created_by_name ? ` · by ${lead.created_by_name}` : ""}
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <StageBadge stage={lead.stage} />
              <PriorityBadge priority={lead.priority} />
              <LeadScoreBadge score={score} />
              {tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] border bg-muted text-foreground border-border">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <AssignedChip lead={lead} leadId={leadId} session={session} canEdit={canEdit} canManageAssignment={canManageAssignment} />
          <IconAction href={`tel:${lead.phone}`} icon={Phone} label="Call" disabled={!lead.phone} />
          <IconAction href={lead.email ? `mailto:${lead.email}` : "#"} icon={Mail} label="Email" disabled={!lead.email} />
          <IconAction href={`https://wa.me/${(lead.whatsapp || lead.phone || "").replace(/\D/g, "")}`} icon={MessageCircle} label="WhatsApp" disabled={!lead.whatsapp && !lead.phone} />
          <MoreActionsMenu
            lead={lead} leadId={leadId} canEdit={canEdit} canManageAssignment={canManageAssignment} canManageDocs={canManageDocs}
            paymentsEnabled={paymentsEnabled} employees={employees} assignedTo={lead.assigned_to}
          />
        </div>
      </div>
    </div>
  );
}
