import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primary" | "secondary" | "ghost" | "danger";
type Tamanho = "sm" | "md" | "lg";

// Botões usam verde chapado (#059669). Gradiente é só para a marca.
// Sobre o degradê da marca: primário é BRANCO cheio (destaque máximo),
// secundário é vidro translúcido, clássico de UI sobre fundo colorido.
const VARIANTES: Record<Variante, string> = {
  primary:
    "bg-white text-brand-dark font-semibold shadow-lg shadow-black/10 hover:bg-white/90",
  secondary:
    "border border-white/40 bg-white/15 text-white backdrop-blur-md hover:bg-white/25",
  ghost: "text-white/90 hover:bg-white/15 hover:text-white",
  danger: "bg-danger text-white shadow-lg shadow-black/10 hover:bg-red-700",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-base rounded-lg",
};

// `whitespace-nowrap`: rótulo de botão nunca quebra linha. Sem isso, dentro
// de tabela estreita o "Marcar como paga" virava duas linhas e estourava a
// célula — apareceu num notebook de tela menor, mas valia para toda tabela
// com coluna de ações. Tabela apertada deve ROLAR, não amassar o botão.
const BASE =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors " +
  "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer";

export function classesBotao(variante: Variante = "primary", tamanho: Tamanho = "md") {
  return `${BASE} ${VARIANTES[variante]} ${TAMANHOS[tamanho]}`;
}

interface ButtonProps extends ComponentProps<"button"> {
  variante?: Variante;
  tamanho?: Tamanho;
}

export function Button({
  variante = "primary",
  tamanho = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${classesBotao(variante, tamanho)} ${className}`}
      {...props}
    />
  );
}

interface ButtonLinkProps {
  href: string;
  variante?: Variante;
  tamanho?: Tamanho;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({
  href,
  variante = "primary",
  tamanho = "md",
  className = "",
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={`${classesBotao(variante, tamanho)} ${className}`}>
      {children}
    </Link>
  );
}
