"use client";
import { useState } from "react";
import { X } from "lucide-react";

export default function TagInput({ value, onChange, suggestions = [] }) {
  const [draft, setDraft] = useState("");
  const tags = (value || "").split(",").map((t) => t.trim()).filter(Boolean);

  function commit(raw) {
    const next = raw.trim();
    if (!next || tags.includes(next)) return;
    onChange([...tags, next].join(","));
    setDraft("");
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag).join(","));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const unusedSuggestions = suggestions.filter((s) => !tags.includes(s) && s.toLowerCase().includes(draft.toLowerCase()) && draft);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 w-full px-2 py-1.5 rounded-lg bg-muted border border-border focus-within:ring-2 focus-within:ring-indigo-500 transition">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-indigo-100 cursor-pointer rounded-full transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          placeholder={tags.length ? "" : "Type and press Enter..."}
          className="flex-1 min-w-[100px] bg-transparent text-foreground text-sm px-1 py-1 focus:outline-none"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {unusedSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="px-2 py-0.5 rounded-full text-xs bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 cursor-pointer transition"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
