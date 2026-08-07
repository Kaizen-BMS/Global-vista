"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import { apiFetch } from "@/components/shared/apiClient";

export default function LeadTasks({ leadId, tasks, canManage }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error();
      setTitle("");
      toast.success("Task created.");
      router.refresh();
    } catch {
      toast.error("Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(taskId, isCompleted) {
    setTogglingId(taskId);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", taskId, isCompleted: !isCompleted }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setTogglingId(null);
    }
  }

  const now = new Date();

  return (
    <div>
      {canManage && (
        <form onSubmit={handleCreate} className="flex gap-2 mb-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task title..."
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add
          </button>
        </form>
      )}

      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-neutral-500 text-sm">No tasks yet.</p>}
        {tasks.map((task) => {
          const overdue = task.due_date && !task.is_completed && new Date(task.due_date) < now;
          return (
            <div key={task.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!task.is_completed}
                  disabled={togglingId === task.id || !canManage}
                  onChange={() => handleToggle(task.id, task.is_completed)}
                  className="cursor-pointer disabled:cursor-not-allowed"
                />
                <div>
                  <p className={`text-sm ${task.is_completed ? "text-neutral-500 line-through" : "text-white"}`}>{task.title}</p>
                  {task.due_date && (
                    <p className={`text-xs ${overdue ? "text-red-400" : "text-neutral-500"}`}>
                      Due {new Date(task.due_date).toLocaleDateString()} {overdue ? "· Overdue" : ""}
                    </p>
                  )}
                </div>
              </div>
              <PriorityBadge priority={task.priority} />
            </div>
          );
        })}
      </div>
    </div>
  );
}