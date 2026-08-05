import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { LIMITE_LINHAS } from "./definicoes";

export interface ItemResumo {
  rotulo: string;
  valor: ReactNode;
  detalhe?: string;
}

/** Mini cards de totais no topo do relatório (por status, por forma, etc.). */
export function CartoesResumo({
  itens,
  colunas = 4,
}: {
  itens: ItemResumo[];
  colunas?: 2 | 3 | 4;
}) {
  if (itens.length === 0) return null;

  const grade =
    colunas === 2
      ? "sm:grid-cols-2"
      : colunas === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`mb-4 grid gap-3 grid-cols-2 ${grade}`}>
      {itens.map((item) => (
        <div
          key={item.rotulo}
          className="glass rounded-2xl px-3 py-3 print:rounded-none print:bg-white print:text-black"
        >
          <p className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
            {item.rotulo}
          </p>
          <p className="mt-0.5 text-xl font-bold text-ink tabular-nums">
            {item.valor}
          </p>
          {item.detalhe && (
            <p className="mt-0.5 text-xs text-ink-muted">{item.detalhe}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Aviso de corte: toda consulta do módulo tem teto de linhas. Quando o
 * resultado bate no teto, os totais são parciais, e a clínica precisa saber.
 */
export function AvisoLimite({
  quantidade,
  limite = LIMITE_LINHAS,
  dica = "Reduza o período ou aplique mais filtros para um total exato.",
}: {
  quantidade: number;
  limite?: number;
  dica?: string;
}) {
  if (quantidade < limite) return null;
  return (
    <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200/40 bg-amber-300/20 px-3 py-2 text-sm text-amber-50">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden />
      <span>
        Mostrando apenas as primeiras {limite.toLocaleString("pt-BR")} linhas do
        filtro. Os totais abaixo são parciais. {dica}
      </span>
    </p>
  );
}

/** Título de um bloco do relatório (relatórios com várias tabelas). */
export function TituloBloco({
  titulo,
  detalhe,
  icone,
}: {
  titulo: string;
  detalhe?: string;
  icone?: ReactNode;
}) {
  return (
    <div className="mt-6 mb-3 first:mt-0">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        {icone}
        {titulo}
      </h2>
      {detalhe && <p className="mt-0.5 text-sm text-ink-muted">{detalhe}</p>}
    </div>
  );
}
