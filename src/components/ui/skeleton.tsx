/** Blocos de carregamento (shimmer) usados nos loading.tsx das rotas. */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/60 ${className}`}
      aria-hidden
    />
  );
}

/** Cabeçalho de página + lista — cobre a maioria das telas. */
export function SkeletonPagina() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="mb-4 h-10 w-full max-w-md" />
      <div className="glass overflow-hidden rounded-2xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-edge px-4 py-3 last:border-0"
          >
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
