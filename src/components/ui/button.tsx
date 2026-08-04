import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primary" | "secondary" | "ghost" | "danger";
type Tamanho = "sm" | "md" | "lg";

// Botões usam verde chapado (#059669) — gradiente é só para a marca.
const VARIANTES: Record<Variante, string> = {
  primary: "bg-brand text-white shadow-sm shadow-brand/25 hover:bg-brand-dark",
  secondary:
    "border border-white/70 bg-white/60 text-ink backdrop-blur-md hover:bg-white/90",
  ghost: "text-ink-muted hover:bg-white/60 hover:text-ink",
  danger: "bg-danger text-white hover:bg-red-700",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-base rounded-lg",
};

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors " +
  "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-brand cursor-pointer";

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
