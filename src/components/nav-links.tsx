"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Icone({ desenho }: { desenho: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0"
      aria-hidden
    >
      {desenho}
    </svg>
  );
}

const ICONES = {
  inicio: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  agenda: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  tutores: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M15.5 14.5c2.8 0 5 1.6 5.8 4.5" />
    </>
  ),
  pets: (
    <>
      <circle cx="7" cy="8.5" r="1.8" />
      <circle cx="12" cy="6.5" r="1.8" />
      <circle cx="17" cy="8.5" r="1.8" />
      <path d="M12 12c-3 0-5.5 2.2-5.5 4.7 0 1.5 1.2 2.3 2.5 2.3 1.1 0 1.9-.5 3-.5s1.9.5 3 .5c1.3 0 2.5-.8 2.5-2.3C17.5 14.2 15 12 12 12Z" />
    </>
  ),
  orcamentos: (
    <>
      <path d="M6 3h9l4 4v14H6Z" />
      <path d="M14.5 3v4.5H19" />
      <path d="M9.5 13.5h5M9.5 17h5" />
    </>
  ),
} as const;

const ITENS: { href: string; rotulo: string; icone: keyof typeof ICONES }[] = [
  { href: "/dashboard", rotulo: "Início", icone: "inicio" },
  { href: "/agenda", rotulo: "Agenda", icone: "agenda" },
  { href: "/tutores", rotulo: "Tutores", icone: "tutores" },
  { href: "/pets", rotulo: "Pets", icone: "pets" },
  { href: "/orcamentos", rotulo: "Orçamentos", icone: "orcamentos" },
];

/** Navegação lateral (desktop). */
export function NavLateral({ ehAdmin }: { ehAdmin: boolean }) {
  const pathname = usePathname();
  const itens = ehAdmin
    ? [
        ...ITENS,
        {
          href: "/configuracoes/usuarios",
          rotulo: "Equipe",
          icone: "tutores" as const,
        },
      ]
    : ITENS;

  return (
    <nav className="flex flex-col gap-1 p-3">
      {itens.map((item) => {
        const ativo =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              ativo
                ? "bg-brand/10 text-brand-dark"
                : "text-ink-muted hover:bg-zinc-100 hover:text-ink"
            }`}
          >
            <Icone desenho={ICONES[item.icone]} />
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

/** Navegação inferior (mobile). */
export function NavInferior() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-edge bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITENS.map((item) => {
        const ativo =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              ativo ? "text-brand" : "text-ink-muted"
            }`}
          >
            <Icone desenho={ICONES[item.icone]} />
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
