import Link from "next/link";
import { HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/actions/storage";

export default function StorageUsageWidget({ usage }) {
  const barColor = usage.percentUsed == null ? "bg-indigo-500" : usage.percentUsed >= 90 ? "bg-red-500" : usage.percentUsed >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <Link href="/workspace/reports/storage" className="block bg-card border border-border rounded-xl p-5 hover:border-muted-foreground/30 transition">
      <div className="flex items-center justify-between mb-3">
        <p className="text-foreground font-medium flex items-center gap-2"><HardDrive className="h-4 w-4 text-indigo-400" /> Storage</p>
        {usage.percentUsed != null && <span className="text-muted-foreground text-xs">{usage.percentUsed}% used</span>}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${usage.percentUsed ?? Math.min(100, (usage.usedBytes / (1024 * 1024 * 1024)) * 100)}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground">{formatBytes(usage.usedBytes)} used</span>
        <span className="text-muted-foreground">{usage.limitBytes != null ? `${formatBytes(usage.remainingBytes)} remaining` : "No plan limit set"}</span>
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
        {usage.byModule.map((m) => (
          <div key={m.module} className="min-w-0">
            <p className="text-muted-foreground text-[10px] truncate">{m.module}</p>
            <p className="text-foreground text-xs font-medium">{formatBytes(m.bytes)}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}
