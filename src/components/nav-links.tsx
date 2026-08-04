"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Package,
  PawPrint,
  ShoppingCart,
  Stethoscope,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

interface Item {
  href: string;
  rotulo: string;
  icone: LucideIcon;
}

interface Grupo {
  titulo?: string;
  itens: Item[];
  somenteAdmin?: boolean;
}

const GRUPOS: Grupo[] = [
  {
    itens: [{ href: "/dashboard", rotulo: "Início", icone: LayoutDashboard }],
  },
  {
    titulo: "Atendimento",
    itens: [
      { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
      { href: "/consultas", rotulo: "Consultas", icone: Stethoscope },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/tutores", rotulo: "Tutores", icone: Users },
      { href: "/pets", rotulo: "Pets", icone: PawPrint },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [{ href: "/orcamentos", rotulo: "Orçamentos", icone: FileText }],
  },
  {
    titulo: "Configurações",
    somenteAdmin: true,
    itens: [
      { href: "/configuracoes/usuarios", rotulo: "Equipe", icone: UserCog },
      { href: "/configuracoes/clinica", rotulo: "Clínica", icone: Building2 },
    ],
  },
];

// Roadmap: módulos das Fases 2 e 3, visíveis mas ainda não disponíveis
const EM_BREVE: { rotulo: string; icone: LucideIcon }[] = [
  { rotulo: "WhatsApp", icone: MessageCircle },
  { rotulo: "Internação", icone: BedDouble },
  { rotulo: "Estoque", icone: Package },
  { rotulo: "PDV", icone: ShoppingCart },
  { rotulo: "Banho e tosa", icone: Bath },
];

function estaAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Navegação lateral (desktop), agrupada por seção. */
export function NavLateral({ ehAdmin }: { ehAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 p-3">
      {GRUPOS.filter((g) => !g.somenteAdmin || ehAdmin).map((grupo, i) => (
        <div key={grupo.titulo ?? i}>
          {grupo.titulo && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted/70">
              {grupo.titulo}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => {
              const ativo = estaAtivo(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    ativo
                      ? "bg-brand/10 text-brand-dark"
                      : "text-ink-muted hover:bg-zinc-100 hover:text-ink"
                  }`}
                >
                  <item.icone
                    className={`size-[18px] shrink-0 ${ativo ? "text-brand" : ""}`}
                    strokeWidth={ativo ? 2.2 : 1.8}
                  />
                  {item.rotulo}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted/70">
          Em breve
        </p>
        <div className="flex flex-col gap-0.5">
          {EM_BREVE.map((item) => (
            <span
              key={item.rotulo}
              className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted/50"
              title="Disponível nas próximas fases"
            >
              <item.icone className="size-[18px] shrink-0" strokeWidth={1.8} />
              {item.rotulo}
              <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted/70">
                breve
              </span>
            </span>
          ))}
        </div>
      </div>
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
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-edge bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITENS_MOBILE.map((item) => {
        const ativo = estaAtivo(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
              ativo ? "text-brand" : "text-ink-muted"
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
