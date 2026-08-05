import Link from "next/link";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cartão de número (KPI).
 *
 * Tudo centralizado — ícone, número e rótulo no eixo do cartão. Numa
 * fileira de cartões, alinhar à esquerda faz cada bloco "cair" para um
 * lado e a linha perde o ritmo; centralizado, a leitura corre de cartão
 * em cartão.
 *
 * Os ícones são SEMPRE iguais (vidro branco sobre o tema): cor em ícone
 * de KPI não carrega informação e vira poluição. A única cor que
 * sobrevive é o vermelho de "crítico", porque ali ela É a informação —
 * dinheiro vencido precisa saltar aos olhos.
 */

type Tom = "neutro" | "positivo" | "atencao" | "critico";

const COR_VALOR: Record<Tom, string> = {
  neutro: "text-ink",
  positivo: "text-ink",
  atencao: "text-ink",
  critico: "text-red-100",
};

export interface EstatisticaProps {
  rotulo: string;
  valor: string | number;
  /** Texto pequeno abaixo do rótulo (ex.: "3 vencidas"). */
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
  const subiu = (variacao ?? 0) >= 0;

  const conteudo = (
    <>
      {Icone && (
        <span className="mb-2.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
          <Icone className="size-5" strokeWidth={1.8} />
        </span>
      )}

      {/* break-words: valor longo (BRL com milhar) não estoura o cartão
          na grade de 2 colunas de um celular de 320px. */}
      <p
        className={cn(
          "text-xl leading-tight font-bold break-words tabular-nums sm:text-[1.75rem]",
          COR_VALOR[tom]
        )}
      >
        {valor}
      </p>

      <p className="mt-1 text-xs break-words text-ink-muted">{rotulo}</p>

      {detalhe && (
        <p className="mt-1 text-[11px] break-words text-ink-muted/85">
          {detalhe}
        </p>
      )}

      {variacao !== undefined && (
        <span
          className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
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
    </>
  );

  const base = cn(
    "glass flex h-full flex-col items-center rounded-2xl p-4 text-center transition-all",
    href && "hover:bg-white/20 hover:shadow-lg hover:shadow-black/10",
    className
  );

  return href ? (
    <Link href={href} className={base}>
      {conteudo}
    </Link>
  ) : (
    <div className={base}>{conteudo}</div>
  );
}

/**
 * Grade de indicadores.
 *
 * As colunas se ajustam à quantidade de cartões (auto-fit): três cartões
 * ocupam a linha inteira em três colunas, dois em duas — nunca sobra
 * buraco à direita, que era o que acontecia com número fixo de colunas.
 * No celular são sempre duas colunas; uma só desperdiça tela.
 *
 * `colunas` virou só uma dica de largura mínima do cartão.
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
  const larguraMinima = colunas >= 5 ? "10.5rem" : "12.5rem";

  return (
    <div
      className={cn(
        "grid grid-cols-2 items-stretch gap-3",
        "sm:grid-cols-[repeat(auto-fit,minmax(var(--min-cartao),1fr))]",
        className
      )}
      style={{ "--min-cartao": larguraMinima } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Barra de progresso fina (uso de plano, meta do mês).
 * Aceita valor acima do máximo sem estourar o desenho.
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
          <span className="min-w-0 truncate text-ink-muted">{rotulo}</span>
          <span
            className={cn(
              "shrink-0 font-semibold tabular-nums",
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
              : "bg-gradient-to-r from-white/70 to-white"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
