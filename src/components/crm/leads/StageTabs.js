"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

// Same `stage` param LeadFilters' (now-hidden, for schools) stage select
// used to read/write — this replaces that dropdown with a more prominent,
// count-badged tab row, same URL contract so nothing else needs to change.
export default function StageTabs({ stages, counts, total }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("stage") || "";
  const [stageList, setStageList] = useState(stages);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  function select(stage) {
    const params = new URLSearchParams(searchParams.toString());
    if (stage) params.set("stage", stage);
    else params.delete("stage");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function submitAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/leads/pipeline-stages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add stage.");
      setStageList((prev) => [...prev, name.trim()]);
      toast.success(`Stage "${name.trim()}" added.`);
      setName("");
      setAdding(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border w-fit mb-4 flex-wrap">
      <button
        onClick={() => select("")}
        className={`px-3 py-1.5 rounded-md text-sm transition cursor-pointer ${active === "" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
      >
        All Students ({total})
      </button>
      {stageList.map((stage) => (
        <button
          key={stage}
          onClick={() => select(stage)}
          className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition cursor-pointer ${active === stage ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          {stage} ({counts[stage] || 0})
        </button>
      ))}
      {adding ? (
        <form onSubmit={submitAdd} className="flex items-center gap-1 px-1">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="New stage name" className="px-2 py-1 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40" />
          <button type="submit" disabled={saving || !name.trim()} className="p-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-60 cursor-pointer">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => { setAdding(false); setName(""); }} className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground text-xs cursor-pointer">Cancel</button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add Stage
        </button>
      )}
    </div>
  );
}
