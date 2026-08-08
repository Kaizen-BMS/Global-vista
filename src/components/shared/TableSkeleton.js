export default function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-border/60 last:border-0">
          {Array.from({ length: cols }).map((_, c) => <div key={c} className="h-4 bg-muted rounded flex-1" />)}
        </div>
      ))}
    </div>
  );
}