"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

interface ItemInicial {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

interface Linha {
  chave: string;
  descricao: string;
  quantidade: string;
  valor_unitario: string;
}

type CampoLinha = keyof Omit<Linha, "chave">;

// Limites (o servidor revalida com os mesmos limites via zod)
const QTD_MAX_CHARS = 6;
const VALOR_MAX_CHARS = 12;
const QTD_MAX = 9999;
const VALOR_MAX = 999999;

// Patterns nativos: com `required` bloqueiam o submit do form pai sem JS extra.
const PATTERN_QUANTIDADE = "\\d+([.,]\\d+)?";
const PATTERN_VALOR = "\\d{1,3}(\\.\\d{3})*(,\\d{1,2})?|\\d+([.,]\\d+)?";

/** Converte texto pt-BR ("1.234,56" ou "12,5") ou padrão ("12.5") em número. */
function paraNumero(texto: string): number {
  const t = texto.trim();
  if (!t) return NaN;
  const normalizado = t.includes(",")
    ? t.replace(/\./g, "").replace(",", ".")
    : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

/** Sanitiza no onChange: só dígitos, vírgula e ponto, cortado no limite. */
function sanitizarNumero(texto: string, maxChars: number): string {
  return texto.replace(/[^\d.,]/g, "").slice(0, maxChars);
}

/**
 * Editor dinâmico de itens do orçamento. Mantém um input hidden name="itens"
 * com o JSON [{descricao, quantidade, valor_unitario}] já normalizado
 * (números com ponto decimal) para a server action. Validação inline: os
 * inputs usam required + pattern (bloqueio nativo do submit) e a mensagem de
 * erro aparece abaixo da linha depois que o usuário toca no campo.
 */
export function ItensEditor({
  itensIniciais,
}: {
  itensIniciais?: ItemInicial[];
}) {
  const novaLinha = (): Linha => ({
    chave: crypto.randomUUID(),
    descricao: "",
    quantidade: "1",
    valor_unitario: "",
  });

  const [linhas, setLinhas] = useState<Linha[]>(() =>
    itensIniciais && itensIniciais.length > 0
      ? itensIniciais.map((item) => ({
          chave: crypto.randomUUID(),
          descricao: item.descricao,
          quantidade: String(Number(item.quantidade)),
          valor_unitario: Number(item.valor_unitario).toFixed(2).replace(".", ","),
        }))
      : [novaLinha()]
  );

  // Campos já tocados (blur) — erros só aparecem depois disso, nunca no
  // primeiro render.
  const [tocados, setTocados] = useState<Record<string, boolean>>({});

  const foiTocado = (chave: string, campo: CampoLinha) =>
    !!tocados[`${chave}:${campo}`];

  function marcarTocado(chave: string, campo: CampoLinha) {
    const id = `${chave}:${campo}`;
    setTocados((atual) => (atual[id] ? atual : { ...atual, [id]: true }));
  }

  function atualizar(chave: string, campo: CampoLinha, valor: string) {
    setLinhas((atual) =>
      atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l))
    );
  }

  function remover(chave: string) {
    setLinhas((atual) =>
      atual.length > 1 ? atual.filter((l) => l.chave !== chave) : atual
    );
  }

  const subtotalDe = (linha: Linha) => {
    const qtd = paraNumero(linha.quantidade);
    const valor = paraNumero(linha.valor_unitario);
    return Number.isFinite(qtd) && Number.isFinite(valor) ? qtd * valor : 0;
  };

  const total = linhas.reduce((soma, linha) => soma + subtotalDe(linha), 0);

  const itensJson = JSON.stringify(
    linhas.map((linha) => {
      const qtd = paraNumero(linha.quantidade);
      const valor = paraNumero(linha.valor_unitario);
      return {
        descricao: linha.descricao.trim(),
        quantidade: Number.isFinite(qtd) ? qtd : 0,
        valor_unitario: Number.isFinite(valor) ? valor : 0,
      };
    })
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="itens" value={itensJson} />

      {/* Cabeçalho das colunas (só em telas maiores) */}
      <div className="hidden items-center gap-2 text-xs font-medium text-ink-muted sm:flex">
        <span className="flex-1">Descrição</span>
        <span className="w-20">Qtd</span>
        <span className="w-28">Valor unit. (R$)</span>
        <span className="w-24 text-right">Subtotal</span>
        <span className="w-8" />
      </div>

      <ul className="space-y-3 sm:space-y-2">
        {linhas.map((linha) => {
          const qtd = paraNumero(linha.quantidade);
          const valor = paraNumero(linha.valor_unitario);

          const erroDescricao =
            foiTocado(linha.chave, "descricao") && !linha.descricao.trim()
              ? "Informe a descrição do item."
              : null;
          const erroQuantidade = foiTocado(linha.chave, "quantidade")
            ? !Number.isFinite(qtd) || qtd <= 0
              ? "Quantidade inválida — use um número maior que zero."
              : qtd > QTD_MAX
                ? `Quantidade máxima: ${QTD_MAX}.`
                : null
            : null;
          const erroValor = foiTocado(linha.chave, "valor_unitario")
            ? !Number.isFinite(valor) || valor < 0
              ? "Valor unitário inválido — use números, como 120 ou 89,90."
              : valor > VALOR_MAX
                ? "Valor unitário máximo: R$ 999.999,00."
                : null
            : null;
          const erroLinha = erroDescricao ?? erroQuantidade ?? erroValor;

          return (
            <li
              key={linha.chave}
              className="rounded-lg border border-edge p-2 sm:rounded-none sm:border-0 sm:p-0"
            >
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Input
                  aria-label="Descrição do item"
                  placeholder="Descrição (ex.: Consulta, Vacina V10…)"
                  required
                  aria-invalid={!!erroDescricao}
                  value={linha.descricao}
                  onChange={(e) =>
                    atualizar(linha.chave, "descricao", e.target.value)
                  }
                  onBlur={() => marcarTocado(linha.chave, "descricao")}
                  className="min-w-0 flex-[1_1_100%] sm:flex-1"
                />
                <Input
                  aria-label="Quantidade"
                  inputMode="decimal"
                  required
                  pattern={PATTERN_QUANTIDADE}
                  maxLength={QTD_MAX_CHARS}
                  title="Use apenas números, com vírgula ou ponto para decimais."
                  aria-invalid={!!erroQuantidade}
                  value={linha.quantidade}
                  onChange={(e) =>
                    atualizar(
                      linha.chave,
                      "quantidade",
                      sanitizarNumero(e.target.value, QTD_MAX_CHARS)
                    )
                  }
                  onBlur={() => marcarTocado(linha.chave, "quantidade")}
                  className="w-20"
                />
                <Input
                  aria-label="Valor unitário em reais"
                  inputMode="decimal"
                  placeholder="0,00"
                  required
                  pattern={PATTERN_VALOR}
                  maxLength={VALOR_MAX_CHARS}
                  title="Use apenas números, com vírgula para os centavos (ex.: 89,90)."
                  aria-invalid={!!erroValor}
                  value={linha.valor_unitario}
                  onChange={(e) =>
                    atualizar(
                      linha.chave,
                      "valor_unitario",
                      sanitizarNumero(e.target.value, VALOR_MAX_CHARS)
                    )
                  }
                  onBlur={() => marcarTocado(linha.chave, "valor_unitario")}
                  className="w-28"
                />
                <span className="min-w-24 flex-1 text-right text-sm font-medium text-ink tabular-nums sm:w-24 sm:flex-none">
                  {formatBRL(subtotalDe(linha))}
                </span>
                <button
                  type="button"
                  aria-label="Remover item"
                  title="Remover item"
                  disabled={linhas.length === 1}
                  onClick={() => remover(linha.chave)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-40"
                >
                  <X className="size-4" />
                </button>
              </div>
              {erroLinha && (
                <p className="mt-1 text-xs font-medium text-danger" role="alert">
                  {erroLinha}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
        <Button
          type="button"
          variante="secondary"
          tamanho="sm"
          onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
        >
          <Plus className="size-4" />
          Adicionar item
        </Button>
        <p className="flex items-baseline gap-2">
          <span className="text-sm text-ink-muted">TOTAL</span>
          <span className="text-lg font-bold text-ink">{formatBRL(total)}</span>
        </p>
      </div>
    </div>
  );
}
