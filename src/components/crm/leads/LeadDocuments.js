"use client";

import { DOCUMENT_TYPES } from "@/lib/modules/crm/constants/leadStages";
import { FileText, Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { apiFetch } from "@/components/shared/apiClient";

export default function LeadDocuments({ leadId, documents, canManage }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(docId) {
    setDeletingId(docId);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/documents?docId=${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Document removed.");
      router.refresh();
    } catch {
      toast.error("Failed to remove document.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {canManage && (
        <p className="text-muted-foreground text-xs mb-4">
          Upload widget pending storage integration (S3 / Hostinger). Types supported: {DOCUMENT_TYPES.join(", ")}.
        </p>
      )}
      <div className="space-y-2">
        {documents.length === 0 && <p className="text-muted-foreground text-sm">No documents uploaded.</p>}
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground text-sm truncate">{doc.file_name}</p>
                <p className="text-muted-foreground text-xs">{doc.type} · {doc.uploaded_by_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Download className="h-4 w-4" />
              </a>
              {canManage && (
                <button onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id} className="text-muted-foreground hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}