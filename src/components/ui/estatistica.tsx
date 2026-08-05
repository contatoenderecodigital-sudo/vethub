import Link from "next/link";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cartão de número (KPI). Padroniza os indicadores do sistema: número
 * grande e legível, rótulo curto, ícone num quadrado da cor do tema e,
 * quando fizer sentido, a variação em relação ao período anterior.
 *
 * Substitui os blocos soltos que cada tela montava do seu jeito.
 */

type Tom = "neutro" | "positivo" | "atencao" | "critico";

const TONS: Record<Tom, { icone: string; valor: string }> = {
  neutro: { icone: "bg-white/20 text-white", valor: "text-ink" },
  positivo: { icone: "bg-emerald-300/25 text-emerald-50", valor: "text-emerald-50" },
  atencao: { icone: "bg-amber-300/25 text-amber-50", valor: "text-amber-50" },
  critico: { icone: "bg-red-400/25 text-red-50", valor: "text-red-50" },
};

export interface EstatisticaProps {
  rotulo: string;
  valor: string | number;
  /** Texto pequeno abaixo do número (ex.: "3 vencidas"). */
  detalhe?: string;
  icone?: LucideIcon;
  tom?: Tom;
  /** Variação percentual contra o período anterior. */
  variacao?: number;
  href?: string;
  className?: string;
}

export function Estatistica({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  tom = "neutro",
  variacao,
  href,
  className,
}: EstatisticaProps) {
  const cores = TONS[tom];
  const subiu = (variacao ?? 0) >= 0;

  const conteudo = (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        {Icone && (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              cores.icone
            )}
          >
            <Icone className="size-5" strokeWidth={1.8} />
          </span>
        )}
        {variacao !== undefined && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              subiu
                ? "bg-emerald-300/25 text-emerald-50"
                : "bg-amber-300/25 text-amber-50"
            )}
            title="Comparado ao período anterior"
          >
            {subiu ? (
              <TrendingUp className="size-3" strokeWidth={2.4} />
            ) : (
              <TrendingDown className="size-3" strokeWidth={2.4} />
            )}
            {Math.abs(variacao).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}
            %
          </span>
        )}
      </div>

      {/* break-words: valores longos (BRL com milhar) não estouram o cartão
          na grade de 2 colunas de um celular de 320px. */}
      <p
        className={cn(
          "text-xl leading-tight font-bold break-words tabular-nums sm:text-[1.75rem]",
          cores.valor
        )}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-xs break-words text-ink-muted">{rotulo}</p>
      {detalhe && (
        <p className="mt-1 text-[11px] text-ink-muted/80">{detalhe}</p>
      )}
    </>
  );

  const base = cn(
    "glass rounded-2xl p-4 transition-all",
    href && "hover:bg-white/20 hover:shadow-lg hover:shadow-black/10",
    className
  );

  return href ? (
    <Link href={href} className={cn(base, "block")}>
      {conteudo}
    </Link>
  ) : (
    <div className={base}>{conteudo}</div>
  );
}

/**
 * Grade de indicadores. Escolhe a quantidade de colunas conforme o
 * número de cartões, sempre 2 no celular (nunca 1 — desperdiça tela).
 */
export function GradeEstatisticas({
  children,
  colunas = 4,
  className,
}: {
  children: React.ReactNode;
  colunas?: 3 | 4 | 5 | 6;
  className?: string;
}) {
  const grade = {
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-3 lg:grid-cols-5",
    6: "sm:grid-cols-3 lg:grid-cols-6",
  }[colunas];

  return (
    <div className={cn("grid grid-cols-2 gap-3", grade, className)}>
      {children}
    </div>
  );
}

/**
 * Barra de progresso fina (uso de plano, meta do mês).
 * Aceita valor acima de 100% sem estourar o desenho.
 */
export function Progresso({
  valor,
  maximo,
  rotulo,
  className,
}: {
  valor: number;
  maximo: number;
  rotulo?: string;
  className?: string;
}) {
  const pct = maximo > 0 ? Math.min(100, (valor / maximo) * 100) : 0;
  const esgotou = valor >= maximo && maximo > 0;

  return (
    <div className={className}>
      {rotulo && (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-ink-muted">{rotulo}</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              esgotou ? "text-amber-50" : "text-ink"
            )}
          >
            {valor} de {maximo}
          </span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-white/20"
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={maximo}
        aria-label={rotulo}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            esgotou
              ? "bg-gradient-to-r from-amber-300 to-amber-100"
              : "bg-gradient-to-r from-[var(--tema-claro)] to-[var(--tema-menta)]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
