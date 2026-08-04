"use client";

import { useState } from "react";
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

/**
 * Editor dinâmico de itens do orçamento. Mantém um input hidden name="itens"
 * com o JSON [{descricao, quantidade, valor_unitario}] já normalizado
 * (números com ponto decimal) para a server action.
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

  function atualizar(chave: string, campo: keyof Omit<Linha, "chave">, valor: string) {
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
        {linhas.map((linha) => (
          <li
            key={linha.chave}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-edge p-2 sm:flex-nowrap sm:rounded-none sm:border-0 sm:p-0"
          >
            <Input
              aria-label="Descrição do item"
              placeholder="Descrição (ex.: Consulta, Vacina V10…)"
              required
              value={linha.descricao}
              onChange={(e) => atualizar(linha.chave, "descricao", e.target.value)}
              className="min-w-0 flex-[1_1_100%] sm:flex-1"
            />
            <Input
              aria-label="Quantidade"
              type="number"
              min={0.5}
              step={0.5}
              required
              value={linha.quantidade}
              onChange={(e) => atualizar(linha.chave, "quantidade", e.target.value)}
              className="w-20"
            />
            <Input
              aria-label="Valor unitário em reais"
              inputMode="decimal"
              placeholder="0,00"
              required
              value={linha.valor_unitario}
              onChange={(e) =>
                atualizar(linha.chave, "valor_unitario", e.target.value)
              }
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
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-lg text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-40"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
        <Button
          type="button"
          variante="secondary"
          tamanho="sm"
          onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
        >
          + Adicionar item
        </Button>
        <p className="flex items-baseline gap-2">
          <span className="text-sm text-ink-muted">TOTAL</span>
          <span className="text-lg font-bold text-ink">{formatBRL(total)}</span>
        </p>
      </div>
    </div>
  );
}
