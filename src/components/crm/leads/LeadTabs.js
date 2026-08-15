"use client";

import { useState, Children } from "react";

const DEFAULT_TABS = ["Overview", "Timeline", "Notes", "Follow Ups", "Tasks", "Documents", "Payments"];

export default function LeadTabs({ children, tabs = DEFAULT_TABS }) {
  const [active, setActive] = useState(0);
  // Callers conditionally include a tab's content with `{cond && <X/>}` —
  // when `cond` is false that's still a real slot in the children array
  // (React keeps `false`/`null`/`undefined` as positional children), which
  // would silently shift every tab after it out of sync with `tabs`.
  // Filtering here means the position of a conditional child never matters
  // to any caller.
  const panels = Children.toArray(children).filter(Boolean);
  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 border-b border-border">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition cursor-pointer ${
              active === i ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {panels[active]}
    </div>
  );
}