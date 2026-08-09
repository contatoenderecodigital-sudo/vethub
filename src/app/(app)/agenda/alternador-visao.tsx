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

  // No celular troca-se o ÍCONE pelo RÓTULO, não o contrário.
  //
  // Antes sobravam quatro ícones sem palavra nenhuma: um calendário com um
  // dia, um calendário com uma semana e um calendário com um mês são
  // praticamente o mesmo desenho, e ninguém adivinha qual é qual. Escrito,
  // "Dia · Semana · Mês · Kanban" cabe em 390px — são quatro palavras curtas
  // dividindo a largura.
  //
  // Os quatro formam UM controle segmentado: a moldura é do grupo, os itens
  // dividem a largura e só o ativo tem fundo. Soltos, cada botão tinha borda
  // própria e um vão entre eles, e a barra parecia enfeite jogado ali.
  const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm lg:h-9 " +
    "font-medium transition-colors focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-white " +
    "max-sm:h-10 max-sm:flex-1 max-sm:gap-0 max-sm:px-1 max-sm:text-xs";
  const ativo = "bg-white text-brand-dark font-semibold shadow-lg shadow-black/10";
  // No celular a borda e o vidro são do grupo, então o item inativo fica limpo.
  const inativo =
    "text-white transition-colors hover:bg-white/25 " +
    "sm:border sm:border-white/40 sm:bg-white/15 sm:backdrop-blur-md";

  return (
    <nav
      aria-label="Alternar visão da agenda"
      className={
        "flex items-center gap-2 " +
        "max-sm:w-full max-sm:gap-1 max-sm:rounded-full max-sm:border " +
        "max-sm:border-white/40 max-sm:bg-white/15 max-sm:p-1 max-sm:backdrop-blur-md " +
        "sm:flex-wrap"
      }
    >
      {itens.map((item) => (
        <Link
          key={item.visao}
          href={item.href}
          aria-current={visao === item.visao ? "page" : undefined}
          className={`${base} ${visao === item.visao ? ativo : inativo}`}
        >
          <item.icone
            className="size-4 shrink-0 max-sm:hidden"
            strokeWidth={1.8}
            aria-hidden
          />
          <span className="truncate">{item.rotulo}</span>
        </Link>
      ))}
    </nav>
  );
}
