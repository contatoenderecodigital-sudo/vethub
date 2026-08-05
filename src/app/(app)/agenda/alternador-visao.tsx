import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  Columns3,
  List,
  type LucideIcon,
} from "lucide-react";

type Visao = "lista" | "semana" | "mes" | "kanban";

/**
 * Alternador Dia / Semana / Mês / Kanban da agenda.
 * Pills sobre o degradê: ativo em branco cheio, inativo em vidro.
 *
 * Recebe SEMPRE um dia de referência (`data`) e converte para o formato de
 * cada rota: a visão mês usa ?mes=YYYY-MM, as outras usam ?data=YYYY-MM-DD.
 * Quem chama a partir do mês passa como referência o dia 1 (ou hoje, se o
 * mês na tela for o corrente). O filtro ?vet= é preservado em todas.
 */
export function AlternadorVisao({
  visao,
  data,
  vet,
}: {
  visao: Visao;
  data: string;
  vet?: string;
}) {
  const filtroVet = vet ? `&vet=${vet}` : "";
  const porDia = `?data=${data}${filtroVet}`;
  const porMes = `?mes=${data.slice(0, 7)}${filtroVet}`;

  const itens: { visao: Visao; rotulo: string; href: string; icone: LucideIcon }[] =
    [
      { visao: "lista", rotulo: "Dia", href: `/agenda${porDia}`, icone: List },
      {
        visao: "semana",
        rotulo: "Semana",
        href: `/agenda/semana${porDia}`,
        icone: CalendarRange,
      },
      {
        visao: "mes",
        rotulo: "Mês",
        href: `/agenda/mes${porMes}`,
        icone: CalendarDays,
      },
      {
        visao: "kanban",
        rotulo: "Kanban",
        href: `/agenda/kanban${porDia}`,
        icone: Columns3,
      },
    ];

  // No celular sobra só o ícone (4 pílulas com rótulo não cabem em 360px),
  // mas o rótulo continua no HTML para leitor de tela e nome acessível.
  const base =
    "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm " +
    "font-medium transition-colors focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-white " +
    "max-sm:size-11 max-sm:px-0";
  const ativo = "bg-white text-brand-dark font-semibold shadow-lg shadow-black/10";
  const inativo =
    "border border-white/40 bg-white/15 text-white backdrop-blur-md hover:bg-white/25";

  return (
    <nav
      aria-label="Alternar visão da agenda"
      className="flex flex-wrap items-center gap-2"
    >
      {itens.map((item) => (
        <Link
          key={item.visao}
          href={item.href}
          aria-current={visao === item.visao ? "page" : undefined}
          className={`${base} ${visao === item.visao ? ativo : inativo}`}
        >
          <item.icone className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
          <span className="max-sm:sr-only">{item.rotulo}</span>
        </Link>
      ))}
    </nav>
  );
}
