export default function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-neutral-800/60 last:border-0">
          {Array.from({ length: cols }).map((_, c) => <div key={c} className="h-4 bg-neutral-800 rounded flex-1" />)}
        </div>
      ))}
    </div>
  );
}