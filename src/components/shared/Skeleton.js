export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-neutral-800/80 ${className}`} />;
}

export function SkeletonRows({ rows = 4, className = "" }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3, className = "" }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ChartsGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <Skeleton className="h-4 w-1/3 mb-1.5" />
          <Skeleton className="h-3 w-1/4 mb-3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ))}
    </div>
  );
}
