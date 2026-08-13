"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const TABS = [
  { key: "", label: "All Visible" },
  { key: "me", label: "Assigned to Me" },
  { key: "unassigned", label: "Unassigned" },
];

// Same `assignedTo` param LeadFilters' advanced dropdown already reads/writes —
// this is just a more prominent shortcut to the same three most-used values,
// not a second filtering mechanism, so the two controls never disagree.
export default function AssignedToQuickTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("assignedTo") || "";

  function select(key) {
    const params = new URLSearchParams(searchParams.toString());
    if (key) params.set("assignedTo", key);
    else params.delete("assignedTo");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border w-fit mb-4">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => select(t.key)}
          className={`px-3 py-1.5 rounded-md text-sm transition cursor-pointer ${active === t.key ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
