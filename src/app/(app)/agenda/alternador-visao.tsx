import Link from "next/link";
import { Columns3, List } from "lucide-react";

/**
 * Alternador Lista ↔ Kanban da agenda.
 * Pills sobre o degradê: ativo em branco cheio, inativo em vidro.
 * Preserva sempre os filtros da URL (?data= e ?vet=).
 */
export function AlternadorVisao({
  visao,
  data,
  vet,
}: {
  visao: "lista" | "kanban";
  data: string;
  vet?: string;
}) {
  const query = `?data=${data}${vet ? `&vet=${vet}` : ""}`;

  const base =
    "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium " +
    "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-white";
  const ativo = "bg-white text-brand-dark font-semibold shadow-lg shadow-black/10";
  const inativo =
    "border border-white/40 bg-white/15 text-white backdrop-blur-md hover:bg-white/25";

  return (
    <nav aria-label="Alternar visão da agenda" className="flex items-center gap-2">
      <Link
        href={`/agenda${query}`}
        aria-current={visao === "lista" ? "page" : undefined}
        className={`${base} ${visao === "lista" ? ativo : inativo}`}
      >
        <List className="size-4" strokeWidth={1.8} aria-hidden />
        Lista
      </Link>
      <Link
        href={`/agenda/kanban${query}`}
        aria-current={visao === "kanban" ? "page" : undefined}
        className={`${base} ${visao === "kanban" ? ativo : inativo}`}
      >
        <Columns3 className="size-4" strokeWidth={1.8} aria-hidden />
        Kanban
      </Link>
    </nav>
  );
}
