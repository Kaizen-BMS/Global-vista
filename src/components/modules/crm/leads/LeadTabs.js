"use client";

import { useState } from "react";

const TABS = ["Overview", "Timeline", "Notes", "Follow Ups", "Tasks", "Documents"];

export default function LeadTabs({ children }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 border-b border-neutral-800">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition ${
              active === i ? "border-indigo-500 text-white" : "border-transparent text-neutral-500 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {children[active]}
    </div>
  );
}