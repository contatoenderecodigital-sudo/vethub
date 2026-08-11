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

/**
 * Altura de botão: 44px no dedo, a densidade de sempre no mouse.
 *
 * Os tamanhos eram fixos, e a auditoria achou 1.230 alvos de 40px e mais
 * 46 de 32px no celular e no tablet. Nenhum reprova na norma (o mínimo AA
 * é 24px), mas 32px é o botão de remover uma linha de medicamento, apertado
 * com o polegar, em pé, segurando um animal. Errar ali apaga a prescrição
 * inteira que a pessoa acabou de digitar.
 *
 * O corte é em `lg` (1024px) porque é exatamente onde a auditoria para de
 * exigir alvo de toque: dali para cima se usa mouse, e o botão volta ao
 * tamanho compacto para a tabela do balcão continuar cabendo na tela.
 */
const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-11 px-3 text-sm rounded-md lg:h-8",
  md: "h-11 px-4 text-sm rounded-lg lg:h-10",
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
