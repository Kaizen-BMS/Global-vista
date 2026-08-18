"use client";
import { useState } from "react";
import { Clock, MessageCircle } from "lucide-react";

export default function LeadWorkspaceTabs({ timelineSlot, whatsappSlot }) {
  const [tab, setTab] = useState("timeline");
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-1.5 mb-4">
        <button
          onClick={() => setTab("timeline")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition ${tab === "timeline" ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" : "text-muted-foreground border border-transparent hover:bg-muted"}`}
        >
          <Clock className="h-3.5 w-3.5" /> Activity Timeline
        </button>
        <button
          onClick={() => setTab("whatsapp")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition ${tab === "whatsapp" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "text-muted-foreground border border-transparent hover:bg-muted"}`}
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </button>
      </div>
      {tab === "timeline" ? timelineSlot : whatsappSlot}
    </div>
  );
}
