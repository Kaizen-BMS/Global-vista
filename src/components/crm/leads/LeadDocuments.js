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
        <p className="text-neutral-500 text-xs mb-4">
          Upload widget pending storage integration (S3 / Hostinger). Types supported: {DOCUMENT_TYPES.join(", ")}.
        </p>
      )}
      <div className="space-y-2">
        {documents.length === 0 && <p className="text-neutral-500 text-sm">No documents uploaded.</p>}
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-neutral-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{doc.file_name}</p>
                <p className="text-neutral-500 text-xs">{doc.type} · {doc.uploaded_by_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white">
                <Download className="h-4 w-4" />
              </a>
              {canManage && (
                <button onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id} className="text-neutral-400 hover:text-red-400">
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