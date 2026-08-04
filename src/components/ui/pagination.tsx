import Link from "next/link";

/**
 * Paginação por links (server-side). Preserva os demais parâmetros da URL.
 */
export function Pagination({
  pagina,
  totalPaginas,
  baseUrl,
  params = {},
}: {
  pagina: number;
  totalPaginas: number;
  baseUrl: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPaginas <= 1) return null;

  const linkPara = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    sp.set("pagina", String(p));
    return `${baseUrl}?${sp.toString()}`;
  };

  const classe =
    "inline-flex h-9 items-center rounded-lg border border-edge bg-surface px-3 text-sm font-medium text-ink hover:bg-zinc-50";

  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Paginação">
      {pagina > 1 ? (
        <Link href={linkPara(pagina - 1)} className={classe}>
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-ink-muted">
        Página {pagina} de {totalPaginas}
      </span>
      {pagina < totalPaginas ? (
        <Link href={linkPara(pagina + 1)} className={classe}>
          Próxima →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
