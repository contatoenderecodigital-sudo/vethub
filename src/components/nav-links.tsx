"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTravarScroll } from "@/lib/travar-scroll";
import {
  useEffect,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import {
  BadgeCheck,
  Bath,
  ConciergeBell,
  BedDouble,
  Boxes,
  Building2,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  ClipboardList,
  DollarSign,
  FileText,
  FlaskConical,
  Handshake,
  History,
  LayoutDashboard,
  Lock,
  Menu,

  Package,
  PawPrint,
  Percent,
  Pill,
  Repeat,
  Ruler,
  ShoppingCart,
  Stethoscope,
  Store,
  Syringe,
  Tag,
  Tags,
  TriangleAlert,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { IconeWhatsapp } from "@/components/icone-whatsapp";
import { temRecurso, type Recurso } from "@/lib/plano-conta";

/**
 * O ícone pode vir do Lucide ou ser um SVG nosso (o logo do WhatsApp,
 * por exemplo, o Lucide não traz marcas).
 */
type IconeDeMenu = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

interface Item {
  href: string;
  rotulo: string;
  icone: IconeDeMenu;
  /** Rota ainda não construída: aparece esmaecida com selo "breve". */
  breve?: boolean;
  /**
   * Recurso de plano que esta tela exige.
   *
   * Quando a conta não tem, o item continua VISÍVEL, com cadeado, e leva à
   * tela que explica o recurso. Esconder seria pior para os dois lados: a
   * clínica nunca descobre que existe internação no sistema, e nós perdemos
   * a venda que só acontece quando alguém procura a função e não acha.
   */
  recurso?: Recurso;
  /**
   * Tela do dia a dia: o Next busca os DADOS dela antes do clique, então a
   * troca de aba é instantânea em vez de esperar meio segundo.
   *
   * Não é para marcar tudo: por padrão o Next só pré-carrega o esqueleto da
   * página, e pedir os dados de toda rota do menu faria a clínica consultar
   * o banco para telas que ninguém vai abrir. Só as mais usadas valem a
   * troca (com `staleTimes.dynamic: 30`, o que veio adiantado vale 30s).
   */
  quente?: boolean;
}

interface Grupo {
  titulo: string;
  icone: IconeDeMenu;
  itens: Item[];
  somenteAdmin?: boolean;
}

/**
 * Navegação em dois níveis: cada categoria abre um submenu (accordion),
 * no estilo dos ERPs do setor. A categoria que contém a rota atual abre
 * sozinha; o usuário pode abrir/fechar as outras.
 */
const INICIO: Item = {
  href: "/dashboard",
  rotulo: "Início",
  icone: LayoutDashboard,
  quente: true,
};

const BALCAO: Item = {
  href: "/balcao",
  rotulo: "Balcão",
  icone: ConciergeBell,
  quente: true,
};

const GRUPOS: Grupo[] = [
  {
    titulo: "Atendimento",
    icone: Stethoscope,
    itens: [
      { href: "/agenda", rotulo: "Agenda", icone: CalendarDays, quente: true },
      { href: "/consultas", rotulo: "Consultas", icone: Stethoscope, quente: true },
      { href: "/receitas", rotulo: "Receituário", icone: Pill },
      { href: "/receitas/medicamentos", rotulo: "Medicamentos", icone: Syringe },
      { href: "/exames", rotulo: "Exames", icone: FlaskConical },
      { href: "/internacao", rotulo: "Internação", icone: BedDouble, recurso: "internacao" },
      { href: "/banho-tosa", rotulo: "Banho e tosa", icone: Bath },
      { href: "/banho-tosa/fichas", rotulo: "Fichas de tosa", icone: ClipboardList },
    ],
  },
  {
    titulo: "Cadastros",
    icone: Users,
    itens: [
      { href: "/tutores", rotulo: "Tutores", icone: Users, quente: true },
      { href: "/pets", rotulo: "Pets", icone: PawPrint, quente: true },
      { href: "/fornecedores", rotulo: "Fornecedores", icone: Handshake },
    ],
  },
  {
    titulo: "Itens",
    icone: Package,
    itens: [
      { href: "/itens", rotulo: "Produtos e serviços", icone: Package },
      { href: "/itens/grupos", rotulo: "Grupos e subgrupos", icone: Tags },
      { href: "/itens/marcas", rotulo: "Marcas", icone: Tag },
      { href: "/itens/unidades", rotulo: "Unidades", icone: Ruler },
      { href: "/estoque", rotulo: "Estoque", icone: Boxes },
      { href: "/estoque/validade", rotulo: "Controle de validade", icone: TriangleAlert },
      { href: "/compras", rotulo: "Compras", icone: Truck },
    ],
  },
  {
    titulo: "Financeiro",
    icone: DollarSign,
    itens: [
      { href: "/financeiro", rotulo: "Painel financeiro", icone: ChartColumn },
      { href: "/orcamentos", rotulo: "Orçamentos", icone: FileText },
      { href: "/pdv", rotulo: "PDV e vendas", icone: ShoppingCart },
      { href: "/financeiro/receber", rotulo: "Contas a receber", icone: Wallet },
      { href: "/financeiro/pagar", rotulo: "Contas a pagar", icone: Wallet },
      { href: "/financeiro/comissoes", rotulo: "Comissões", icone: Percent, recurso: "comissoes" },
      { href: "/planos", rotulo: "Planos", icone: ClipboardList, recurso: "planos_de_saude" },
      { href: "/planos/assinaturas", rotulo: "Assinaturas", icone: Repeat, recurso: "planos_de_saude" },
    ],
  },
  {
    titulo: "Relatórios",
    icone: ChartColumn,
    itens: [
      { href: "/relatorios", rotulo: "Todos os relatórios", icone: ChartColumn },
      { href: "/relatorios/atendimentos", rotulo: "Atendimentos", icone: CalendarDays },
      { href: "/relatorios/faturamento", rotulo: "Faturamento", icone: DollarSign, recurso: "relatorios_avancados" },
      { href: "/relatorios/insumos", rotulo: "Insumos", icone: Syringe, recurso: "relatorios_avancados" },
      { href: "/relatorios/estoque", rotulo: "Estoque", icone: Boxes },
      { href: "/relatorios/financeiro", rotulo: "Financeiro", icone: Wallet },
      { href: "/relatorios/clientes", rotulo: "Clientes", icone: Users, recurso: "relatorios_avancados" },
      { href: "/relatorios/vacinas", rotulo: "Vacinas a vencer", icone: Syringe, recurso: "relatorios_avancados" },
    ],
  },
  {
    titulo: "Configurações",
    icone: UserCog,
    somenteAdmin: true,
    itens: [
      { href: "/configuracoes/whatsapp", rotulo: "WhatsApp", icone: IconeWhatsapp, recurso: "whatsapp" },
      { href: "/configuracoes/usuarios", rotulo: "Equipe", icone: UserCog },
      { href: "/configuracoes/clinica", rotulo: "Clínica", icone: Building2 },
      { href: "/configuracoes/unidades", rotulo: "Unidades", icone: Store, recurso: "multi_unidade" },
      { href: "/configuracoes/auditoria", rotulo: "Histórico de alterações", icone: History },
      { href: "/assinatura", rotulo: "Assinatura", icone: BadgeCheck },
    ],
  },
];

/** Todos os endereços do menu, para saber qual deles casa melhor. */
const TODOS_OS_HREFS = [INICIO.href, BALCAO.href, ...GRUPOS.flatMap((g) => g.itens.map((i) => i.href))];

/**
 * O endereço do menu que melhor descreve a tela atual.
 *
 * Casar por prefixo sozinho acende dois itens ao mesmo tempo: em
 * `/financeiro/receber` acendiam "Painel financeiro" (`/financeiro`) e
 * "Contas a receber". Ganha sempre o endereço MAIS LONGO que casa, que é o
 * mais específico.
 */
function hrefAtivo(pathname: string): string | null {
  let melhor: string | null = null;
  for (const href of TODOS_OS_HREFS) {
    if (pathname !== href && !pathname.startsWith(href + "/")) continue;
    if (!melhor || href.length > melhor.length) melhor = href;
  }
  return melhor;
}

function estaAtivo(pathname: string, href: string) {
  return hrefAtivo(pathname) === href;
}

/** A categoria fica ativa quando alguma rota dela é a atual. */
function grupoAtivo(pathname: string, grupo: Grupo) {
  return grupo.itens.some((i) => !i.breve && estaAtivo(pathname, i.href));
}

/**
 * Item fora do plano da conta.
 *
 * Quem está no teste vê tudo destrancado — é justamente o que faz a pessoa
 * sentir falta depois.
 */
function estaBloqueado(item: Item, plano: string) {
  return item.recurso != null && !temRecurso(plano, item.recurso);
}

/**
 * Para onde o item leva.
 *
 * Trancado, ele NÃO leva à tela trancada: vai direto para a explicação do
 * recurso. O servidor faria o mesmo desvio, mas passando pela rota real a
 * pessoa veria a tela piscar antes de trocar — parece defeito.
 */
function destinoDoItem(item: Item, bloqueado: boolean) {
  return bloqueado ? `/assinatura/recurso/${item.recurso}` : item.href;
}

/** Navegação lateral (desktop), com submenus expansíveis. */
export function NavLateral({ ehAdmin, plano }: { ehAdmin: boolean; plano: string }) {
  const pathname = usePathname();
  const visiveis = GRUPOS.filter((g) => !g.somenteAdmin || ehAdmin);

  // Estado derivado: a categoria da rota atual fica aberta sozinha; o
  // clique do usuário guarda só a exceção àquela regra. Assim navegar já
  // abre a seção certa sem effect nenhum.
  const [alternados, setAlternados] = useState<Record<string, boolean>>({});

  const estaAberto = (grupo: Grupo) =>
    alternados[grupo.titulo] ?? grupoAtivo(pathname, grupo);

  function alternar(grupo: Grupo) {
    setAlternados((atual) => ({
      ...atual,
      [grupo.titulo]: !estaAberto(grupo),
    }));
  }

  const inicioAtivo = estaAtivo(pathname, INICIO.href);

  return (
    <nav className="flex flex-col gap-1 p-3">
      {/* Início fica solto no topo, sem categoria */}
      <Link
        href={INICIO.href}
        prefetch={INICIO.quente === true}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          inicioAtivo
            ? "bg-white/25 text-white"
            : "text-ink-muted hover:bg-white/15 hover:text-ink"
        }`}
      >
        <INICIO.icone
          className={`size-[18px] shrink-0 ${inicioAtivo ? "text-brand-mint" : ""}`}
          strokeWidth={inicioAtivo ? 2.2 : 1.8}
        />
        {INICIO.rotulo}
      </Link>

      <Link
        href={BALCAO.href}
        prefetch
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          estaAtivo(pathname, BALCAO.href)
            ? "bg-white/25 text-white"
            : "text-ink-muted hover:bg-white/15 hover:text-ink"
        }`}
      >
        <BALCAO.icone
          className={`size-[18px] shrink-0 ${estaAtivo(pathname, BALCAO.href) ? "text-brand-mint" : ""}`}
          strokeWidth={estaAtivo(pathname, BALCAO.href) ? 2.2 : 1.8}
        />
        {BALCAO.rotulo}
      </Link>

      {visiveis.map((grupo) => {
        const aberto = estaAberto(grupo);
        const temAtivo = grupoAtivo(pathname, grupo);

        return (
          <div key={grupo.titulo}>
            <button
              type="button"
              onClick={() => alternar(grupo)}
              aria-expanded={aberto}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                temAtivo && !aberto
                  ? "bg-white/15 text-white"
                  : "text-ink-muted hover:bg-white/15 hover:text-ink"
              }`}
            >
              <grupo.icone
                className={`size-[18px] shrink-0 ${temAtivo ? "text-brand-mint" : ""}`}
                strokeWidth={1.8}
              />
              <span className="flex-1 text-left">{grupo.titulo}</span>
              <ChevronDown
                className={`size-4 shrink-0 transition-transform ${
                  aberto ? "rotate-180" : ""
                }`}
                strokeWidth={1.8}
              />
            </button>

            {aberto && (
              <div className="ml-[1.4rem] mt-0.5 flex flex-col gap-0.5 border-l border-white/20 pl-2">
                {grupo.itens.map((item) =>
                  item.breve ? (
                    <span
                      key={item.href}
                      title="Disponível em breve"
                      className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-ink-muted/45"
                    >
                      <item.icone className="size-4 shrink-0" strokeWidth={1.8} />
                      <span className="flex-1 truncate">{item.rotulo}</span>
                      <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                        breve
                      </span>
                    </span>
                  ) : (
                    (() => {
                      const bloqueado = estaBloqueado(item, plano);
                      return (
                        <Link
                          key={item.href}
                          href={destinoDoItem(item, bloqueado)}
                          prefetch={!bloqueado && item.quente === true}
                          title={bloqueado ? "Disponível em outro plano" : undefined}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                            !bloqueado && estaAtivo(pathname, item.href)
                              ? "bg-white/25 font-semibold text-white"
                              : "text-ink-muted hover:bg-white/15 hover:text-ink"
                          }`}
                        >
                          <item.icone className="size-4 shrink-0" strokeWidth={1.8} />
                          <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
                          {bloqueado && (
                            <Lock
                              className="size-3.5 shrink-0 opacity-70"
                              strokeWidth={2.2}
                              aria-label="Disponível em outro plano"
                            />
                          )}
                        </Link>
                      );
                    })()
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Atalhos fixos da barra inferior. O 5º slot é o botão "Mais". */
const ITENS_MOBILE: Item[] = [
  { href: "/dashboard", rotulo: "Início", icone: LayoutDashboard, quente: true },
  { href: "/agenda", rotulo: "Agenda", icone: CalendarDays, quente: true },
  { href: "/consultas", rotulo: "Consultas", icone: Stethoscope, quente: true },
  { href: "/tutores", rotulo: "Tutores", icone: Users, quente: true },
];

/**
 * Navegação inferior (mobile). Quatro atalhos + "Mais", que abre um painel
 * de baixo para cima com TODAS as seções do menu lateral. Sem ele o celular
 * não alcançaria Itens, Financeiro, Relatórios e Configurações.
 */
export function NavInferior({ ehAdmin, plano }: { ehAdmin: boolean; plano: string }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const visiveis = GRUPOS.filter((g) => !g.somenteAdmin || ehAdmin);

  // Sem isto, arrastar o dedo sobre o menu rola a PÁGINA DE TRÁS: a pessoa
  // fecha o menu e a tela mudou de lugar sozinha.
  useTravarScroll(aberto);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  // O item ativo era distinguido por COR (menta sobre a barra), e a 10px isso
  // media 2.37:1 — o rótulo mais ilegível do app inteiro. Cor não deve ser o
  // único sinal de estado: agora o ativo é branco cheio e em negrito, e o
  // inativo continua branco a 88%. A diferença aparece pelo peso, que
  // funciona também para quem não distingue as duas cores.
  const classeItem = (ativo: boolean) =>
    `flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] ${
      ativo ? "font-bold text-white" : "font-medium text-ink-muted"
    }`;

  return (
    <>
      {aberto && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden">
          {/* Toque fora fecha */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Todas as seções"
            className="glass-menu relative max-h-[80dvh] overflow-y-auto rounded-t-3xl px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <span
              aria-hidden
              className="mx-auto mb-2 block h-1 w-10 rounded-full bg-white/50"
            />
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-white drop-shadow-sm">
                Todas as seções
              </p>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium text-white/85 hover:bg-white/15 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <Link
              href={INICIO.href}
              onClick={() => setAberto(false)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                estaAtivo(pathname, INICIO.href)
                  ? "bg-white/25 text-white"
                  : "text-ink-muted hover:bg-white/15 hover:text-ink"
              }`}
            >
              <INICIO.icone className="size-[18px] shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 truncate">{INICIO.rotulo}</span>
            </Link>

            <Link
              href={BALCAO.href}
              onClick={() => setAberto(false)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                estaAtivo(pathname, BALCAO.href)
                  ? "bg-white/25 text-white"
                  : "text-ink-muted hover:bg-white/15 hover:text-ink"
              }`}
            >
              <BALCAO.icone className="size-[18px] shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 truncate">{BALCAO.rotulo}</span>
            </Link>

            {/* Uma linha fina separa os grupos. Antes só o espaço em branco
                fazia esse trabalho, e a folha inteira lia como uma lista
                corrida de vinte itens sem começo nem fim. */}
            {visiveis.map((grupo) => (
              <div
                key={grupo.titulo}
                className="mt-2 border-t border-white/12 pt-2 first:border-t-0"
              >
                <p className="flex items-center gap-2 px-3 pb-0.5 text-[10px] font-semibold tracking-[0.14em] text-white/55 uppercase">
                  <grupo.icone className="size-3 shrink-0" strokeWidth={2.2} />
                  {grupo.titulo}
                </p>
                <div className="flex flex-col gap-0.5">
                  {grupo.itens.map((item) =>
                    item.breve ? (
                      <span
                        key={item.href}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-ink-muted/45"
                      >
                        <item.icone className="size-[18px] shrink-0" strokeWidth={1.8} />
                        <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
                        <span className="shrink-0 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase">
                          breve
                        </span>
                      </span>
                    ) : (
                      (() => {
                        const bloqueado = estaBloqueado(item, plano);
                        return (
                          <Link
                            key={item.href}
                            href={destinoDoItem(item, bloqueado)}
                            onClick={() => setAberto(false)}
                            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${
                              !bloqueado && estaAtivo(pathname, item.href)
                                ? "bg-white/25 font-semibold text-white"
                                : "text-ink-muted hover:bg-white/15 hover:text-ink"
                            }`}
                          >
                            <item.icone className="size-[18px] shrink-0" strokeWidth={1.8} />
                            <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
                            {bloqueado && (
                              <Lock
                                className="size-4 shrink-0 opacity-70"
                                strokeWidth={2.2}
                                aria-label="Disponível em outro plano"
                              />
                            )}
                          </Link>
                        );
                      })()
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav
        data-guia="barra"
        className="glass-forte fixed inset-x-3 bottom-3 z-30 flex rounded-2xl pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {ITENS_MOBILE.map((item) => {
          const ativo = estaAtivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.quente === true}
              className={classeItem(ativo)}
            >
              <item.icone className="size-5 shrink-0" strokeWidth={ativo ? 2.2 : 1.8} />
              <span className="max-w-full truncate">{item.rotulo}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          className={`${classeItem(aberto)} cursor-pointer`}
        >
          <Menu className="size-5 shrink-0" strokeWidth={aberto ? 2.2 : 1.8} />
          <span className="max-w-full truncate">Mais</span>
        </button>
      </nav>
    </>
  );
}
