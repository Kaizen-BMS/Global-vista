"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Pencil, Phone, Mail, MessageCircle, MoreHorizontal, UserCog, UploadCloud, Wallet,
} from "lucide-react";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import LeadScoreBadge from "@/components/crm/badges/LeadScoreBadge";
import LeadScoreBar from "@/components/crm/badges/LeadScoreBar";
import { TakeLeadButton, ReleaseLeadButton, AssignToPicker } from "@/components/crm/leads/LeadAssignmentAction";

function IconAction({ href, icon: Icon, label, disabled }) {
  if (disabled) return null;
  return (
    <a href={href} title={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:border-indigo-500/40 hover:bg-indigo-500/5 text-xs transition cursor-pointer">
      <Icon className="h-3.5 w-3.5" /> {label}
    </a>
  );
}

function MoreActionsMenu({ leadId, canEdit, canManageAssignment, canManageDocs, paymentsEnabled, employees, assignedTo }) {
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
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-center h-8 w-8 rounded-lg bg-card border border-border text-foreground hover:bg-muted cursor-pointer transition">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
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

export default function LeadHeader({ lead, leadId, score, tags, session, canEdit, canManageAssignment, canManageDocs, paymentsEnabled, employees }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-12 w-12 shrink-0 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-lg font-semibold">
            {lead.name?.trim()?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs mb-0.5">{lead.lead_number}</p>
            <h1 className="text-xl font-semibold text-foreground truncate">{lead.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StageBadge stage={lead.stage} />
              <PriorityBadge priority={lead.priority} />
              <LeadScoreBadge score={score} />
              {tags.map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full text-xs border bg-muted text-foreground border-border">#{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MoreActionsMenu
            leadId={leadId} canEdit={canEdit} canManageAssignment={canManageAssignment} canManageDocs={canManageDocs}
            paymentsEnabled={paymentsEnabled} employees={employees} assignedTo={lead.assigned_to}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-border">
        <IconAction href={`tel:${lead.phone}`} icon={Phone} label="Call" disabled={!lead.phone} />
        <IconAction href={lead.email ? `mailto:${lead.email}` : "#"} icon={Mail} label="Email" disabled={!lead.email} />
        <IconAction href={`https://wa.me/${(lead.whatsapp || lead.phone || "").replace(/\D/g, "")}`} icon={MessageCircle} label="WhatsApp" disabled={!lead.whatsapp && !lead.phone} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        <InfoBlock label="Phone" value={lead.phone} />
        <InfoBlock label="Email" value={lead.email || "—"} />
        <InfoBlock label="Source" value={lead.source_form_name ? `${lead.source_name} — ${lead.source_form_name}` : lead.source_name} />
        <InfoBlock
          label="Assigned To"
          value={
            !lead.assigned_to
              ? (canEdit ? <TakeLeadButton leadId={leadId} /> : "Unassigned")
              : lead.assigned_to === session.id || canManageAssignment
                ? <span className="flex items-center gap-2"><span className="truncate">{lead.assigned_name}</span><ReleaseLeadButton leadId={leadId} /></span>
                : lead.assigned_name
          }
        />
      </div>

      <div className="mt-5">
        <LeadScoreBar score={score} />
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="text-foreground text-sm truncate">{value}</p>
    </div>
  );
}
