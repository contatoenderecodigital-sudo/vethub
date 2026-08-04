"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bath,
  BedDouble,
  Boxes,
  Building2,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  ClipboardList,
  DollarSign,
  FileText,
  Handshake,
  LayoutDashboard,
  MessageCircle,
  Package,
  PawPrint,
  Percent,
  Pill,
  Repeat,
  Ruler,
  ShoppingCart,
  Stethoscope,
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

interface Item {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Rota ainda não construída: aparece esmaecida com selo "breve". */
  breve?: boolean;
}

interface Grupo {
  titulo: string;
  icone: LucideIcon;
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
};

const GRUPOS: Grupo[] = [
  {
    titulo: "Atendimento",
    icone: Stethoscope,
    itens: [
      { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
      { href: "/consultas", rotulo: "Consultas", icone: Stethoscope },
      { href: "/receitas", rotulo: "Receituário", icone: Pill },
      { href: "/internacao", rotulo: "Internação", icone: BedDouble },
      { href: "/banho-tosa", rotulo: "Banho e tosa", icone: Bath },
      { href: "/banho-tosa/fichas", rotulo: "Fichas de tosa", icone: ClipboardList },
    ],
  },
  {
    titulo: "Cadastros",
    icone: Users,
    itens: [
      { href: "/tutores", rotulo: "Tutores", icone: Users },
      { href: "/pets", rotulo: "Pets", icone: PawPrint },
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
      { href: "/financeiro/comissoes", rotulo: "Comissões", icone: Percent, breve: true },
      { href: "/planos", rotulo: "Planos", icone: ClipboardList },
      { href: "/planos/assinaturas", rotulo: "Assinaturas", icone: Repeat },
    ],
  },
  {
    titulo: "Relatórios",
    icone: ChartColumn,
    itens: [
      { href: "/relatorios", rotulo: "Todos os relatórios", icone: ChartColumn },
      { href: "/relatorios/atendimentos", rotulo: "Atendimentos", icone: CalendarDays },
      { href: "/relatorios/faturamento", rotulo: "Faturamento", icone: DollarSign },
      { href: "/relatorios/insumos", rotulo: "Insumos", icone: Syringe },
      { href: "/relatorios/estoque", rotulo: "Estoque", icone: Boxes },
      { href: "/relatorios/financeiro", rotulo: "Financeiro", icone: Wallet },
      { href: "/relatorios/clientes", rotulo: "Clientes", icone: Users },
    ],
  },
  {
    titulo: "Configurações",
    icone: UserCog,
    somenteAdmin: true,
    itens: [
      { href: "/configuracoes/whatsapp", rotulo: "WhatsApp", icone: MessageCircle },
      { href: "/configuracoes/usuarios", rotulo: "Equipe", icone: UserCog },
      { href: "/configuracoes/clinica", rotulo: "Clínica", icone: Building2 },
    ],
  },
];

function estaAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** A categoria fica ativa quando alguma rota dela é a atual. */
function grupoAtivo(pathname: string, grupo: Grupo) {
  return grupo.itens.some((i) => !i.breve && estaAtivo(pathname, i.href));
}

/** Navegação lateral (desktop), com submenus expansíveis. */
export function NavLateral({ ehAdmin }: { ehAdmin: boolean }) {
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
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        estaAtivo(pathname, item.href)
                          ? "bg-white/25 font-semibold text-white"
                          : "text-ink-muted hover:bg-white/15 hover:text-ink"
                      }`}
                    >
                      <item.icone className="size-4 shrink-0" strokeWidth={1.8} />
                      <span className="truncate">{item.rotulo}</span>
                    </Link>
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

const ITENS_MOBILE: Item[] = [
  { href: "/dashboard", rotulo: "Início", icone: LayoutDashboard },
  { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
  { href: "/consultas", rotulo: "Consultas", icone: Stethoscope },
  { href: "/tutores", rotulo: "Tutores", icone: Users },
  { href: "/pets", rotulo: "Pets", icone: PawPrint },
];

/** Navegação inferior (mobile). */
export function NavInferior() {
  const pathname = usePathname();
  return (
    <nav className="glass-forte fixed inset-x-3 bottom-3 z-30 flex rounded-2xl pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITENS_MOBILE.map((item) => {
        const ativo = estaAtivo(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
              ativo ? "text-brand-mint" : "text-ink-muted"
            }`}
          >
            <item.icone className="size-5" strokeWidth={ativo ? 2.2 : 1.8} />
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
