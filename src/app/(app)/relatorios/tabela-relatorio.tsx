import type { ReactNode } from "react";

export interface ColunaRelatorio<T> {
  rotulo: string;
  /** Alinha à direita e liga `tabular-nums` (valores e quantidades). */
  numerica?: boolean;
  className?: string;
  celula: (linha: T, indice: number) => ReactNode;
}

/** Bloco de linhas com título e subtotal, usado nos relatórios agrupados. */
export interface SecaoRelatorio<T> {
  titulo?: string;
  detalhe?: string;
  linhas: T[];
  /** Uma célula por coluna (use null para deixar a célula vazia). */
  subtotal?: (ReactNode | null)[];
}

interface Props<T> {
  colunas: ColunaRelatorio<T>[];
  /** Lista simples. Ignorado quando `secoes` é informado. */
  linhas?: T[];
  secoes?: SecaoRelatorio<T>[];
  chave: (linha: T, indice: number) => string;
  /** Linha de TOTAL destacada, uma célula por coluna. */
  total?: (ReactNode | null)[];
  vazio?: string;
  legenda?: string;
  /** Largura mínima antes de rolar na horizontal (mobile). */
  larguraMinima?: string;
}

/**
 * Tabela padrão dos relatórios: vidro, cabeçalho em caixa alta, linhas
 * separadas por fio branco e uma linha de TOTAL destacada no rodapé.
 * Sempre dentro de `overflow-x-auto`: no celular a tabela rola sozinha.
 */
export function TabelaRelatorio<T>({
  colunas,
  linhas,
  secoes,
  chave,
  total,
  vazio = "Nenhum registro no período.",
  legenda,
  larguraMinima = "44rem",
}: Props<T>) {
  const blocos: SecaoRelatorio<T>[] = secoes ?? [{ linhas: linhas ?? [] }];
  const quantidade = blocos.reduce((soma, b) => soma + b.linhas.length, 0);

  if (quantidade === 0) {
    return (
      <div className="glass rounded-2xl px-4 py-8 text-center text-sm text-ink-muted print:bg-white print:text-black">
        {vazio}
      </div>
    );
  }

  const classeCabecalho = (coluna: ColunaRelatorio<T>) =>
    `whitespace-nowrap px-3 py-2.5 text-xs font-semibold tracking-wide text-ink-muted uppercase ${
      coluna.numerica ? "text-right" : "text-left"
    } ${coluna.className ?? ""}`;

  const classeCelula = (coluna: ColunaRelatorio<T>) =>
    `px-3 py-2 align-top text-ink ${
      coluna.numerica ? "text-right tabular-nums" : ""
    } ${coluna.className ?? ""}`;

  return (
    <div className="glass overflow-hidden rounded-2xl print:rounded-none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: larguraMinima }}>
          {legenda && <caption className="sr-only">{legenda}</caption>}
          <thead>
            <tr className="border-b border-white/25">
              {colunas.map((coluna) => (
                <th key={coluna.rotulo} scope="col" className={classeCabecalho(coluna)}>
                  {coluna.rotulo}
                </th>
              ))}
            </tr>
          </thead>

          {blocos.map((bloco, indiceBloco) => (
            <tbody
              key={bloco.titulo ?? `bloco-${indiceBloco}`}
              className="divide-y divide-white/15 border-t border-white/15 first-of-type:border-t-0"
            >
              {bloco.titulo && (
                <tr className="bg-white/10">
                  <th
                    scope="colgroup"
                    colSpan={colunas.length}
                    className="px-3 py-2 text-left text-sm font-semibold text-ink"
                  >
                    {bloco.titulo}
                    {bloco.detalhe && (
                      <span className="ml-2 text-xs font-normal text-ink-muted">
                        {bloco.detalhe}
                      </span>
                    )}
                  </th>
                </tr>
              )}

              {bloco.linhas.map((linha, indice) => (
                <tr key={chave(linha, indice)}>
                  {colunas.map((coluna) => (
                    <td key={coluna.rotulo} className={classeCelula(coluna)}>
                      {coluna.celula(linha, indice)}
                    </td>
                  ))}
                </tr>
              ))}

              {bloco.subtotal && (
                <tr className="bg-white/10 font-medium text-ink">
                  {colunas.map((coluna, indice) => (
                    <td
                      key={coluna.rotulo}
                      className={`px-3 py-2 ${
                        coluna.numerica ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {bloco.subtotal?.[indice] ?? null}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          ))}

          {total && (
            <tfoot>
              <tr className="border-t-2 border-white/50 bg-white/20 text-sm font-bold text-ink">
                {colunas.map((coluna, indice) => (
                  <td
                    key={coluna.rotulo}
                    className={`px-3 py-3 ${
                      coluna.numerica ? "text-right tabular-nums" : ""
                    }`}
                  >
                    {total[indice] ?? null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
