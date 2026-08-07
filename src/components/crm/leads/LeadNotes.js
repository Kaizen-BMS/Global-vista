"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function LeadNotes({ leadId, notes, canManage }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      setContent("");
      toast.success("Note added.");
      router.refresh();
    } catch {
      toast.error("Failed to add note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {canManage && (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note..."
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="btn-brand mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Note
          </button>
        </form>
      )}

      <div className="space-y-3">
        {notes.length === 0 && <p className="text-neutral-500 text-sm">No notes yet.</p>}
        {notes.map((note) => (
          <div key={note.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium">{note.author_name}</span>
              {!!note.is_pinned && <Pin className="h-3.5 w-3.5 text-yellow-400" />}
            </div>
            <p className="text-neutral-300 text-sm">{note.content}</p>
            <p className="text-neutral-600 text-xs mt-1">{new Date(note.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}