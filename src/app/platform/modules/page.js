import { listModuleAdoption } from "@/lib/platform/actions/companies";
import { Package } from "lucide-react";

export default async function PlatformModulesPage() {
  const modules = await listModuleAdoption();
  const maxAdoption = Math.max(1, ...modules.map((m) => m.company_count));

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Modules</h1>
      <p className="text-muted-foreground text-sm mb-6">Module catalog and tenant adoption. Enable or disable per-company from a company's detail page.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center"><Package className="h-4.5 w-4.5" /></div>
              <span className={`px-2 py-0.5 rounded-full text-[11px] border capitalize ${m.status === "available" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : m.status === "beta" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-muted/20 text-muted-foreground border-border/30"}`}>{m.status}</span>
            </div>
            <p className="text-foreground font-medium">{m.name}</p>
            <p className="text-muted-foreground text-xs mb-3">{m.description || "—"}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{m.company_count} {m.company_count === 1 ? "company" : "companies"}</span>
              <span>{m.category}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(m.company_count / maxAdoption) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
