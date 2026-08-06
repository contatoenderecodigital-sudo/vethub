"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";

/** Produto do catálogo oferecido no select de cada linha. */
export interface ProdutoOpcao {
  id: string;
  nome: string;
  codigo: string | null;
  preco_custo: number;
  controla_estoque: boolean;
}

interface Linha {
  chave: string;
  item_id: string;
  descricao: string;
  quantidade: string;
  valor_unitario: string;
  lote: string;
  validade: string;
}

type CampoLinha = keyof Omit<Linha, "chave">;

// Limites (o servidor revalida com os mesmos limites via zod)
const QTD_MAX_CHARS = 8;
const VALOR_MAX_CHARS = 12;
const QTD_MAX = 999999;
const VALOR_MAX = 9999999.99;

// Patterns nativos: com `required` bloqueiam o submit do form sem JS extra.
const PATTERN_QUANTIDADE = "\\d+([.,]\\d+)?";
const PATTERN_VALOR = "\\d{1,3}(\\.\\d{3})*(,\\d{1,2})?|\\d+([.,]\\d+)?";

/** Converte texto pt-BR ("1.234,56" ou "12,5") ou padrão ("12.5") em número. */
function paraNumero(texto: string): number {
  const t = texto.trim();
  if (!t) return NaN;
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

/** Sanitiza no onChange: só dígitos, vírgula e ponto, cortado no limite. */
function sanitizarNumero(texto: string, maxChars: number): string {
  return texto.replace(/[^\d.,]/g, "").slice(0, maxChars);
}

/**
 * Editor dinâmico dos itens da nota de compra. Cada linha aponta (ou não)
 * para um produto do catálogo. É esse vínculo que faz a mercadoria entrar
 * no estoque quando a compra é recebida. Mantém um input hidden
 * name="itens" com o JSON já normalizado para a server action.
 */
export function CompraItensEditor({
  produtos,
  frete = 0,
}: {
  produtos: ProdutoOpcao[];
  /** Frete do cabeçalho, somado ao total geral do rodapé. */
  frete?: number;
}) {
  const novaLinha = (): Linha => ({
    chave: crypto.randomUUID(),
    item_id: "",
    descricao: "",
    quantidade: "1",
    valor_unitario: "",
    lote: "",
    validade: "",
  });

  const [linhas, setLinhas] = useState<Linha[]>(() => [novaLinha()]);

  // Campos já tocados (blur): erros só aparecem depois disso.
  const [tocados, setTocados] = useState<Record<string, boolean>>({});

  const foiTocado = (chave: string, campo: CampoLinha) => !!tocados[`${chave}:${campo}`];

  function marcarTocado(chave: string, campo: CampoLinha) {
    const id = `${chave}:${campo}`;
    setTocados((atual) => (atual[id] ? atual : { ...atual, [id]: true }));
  }

  function atualizar(chave: string, campo: CampoLinha, valor: string) {
    setLinhas((atual) =>
      atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l))
    );
  }

  /** Ao escolher o produto, já preenche descrição e custo. Só falta a quantidade. */
  function escolherProduto(chave: string, itemId: string) {
    const produto = produtos.find((p) => p.id === itemId);
    setLinhas((atual) =>
      atual.map((l) => {
        if (l.chave !== chave) return l;
        if (!produto) return { ...l, item_id: "" };
        const custo = Number(produto.preco_custo);
        return {
          ...l,
          item_id: itemId,
          descricao: l.descricao.trim() ? l.descricao : produto.nome,
          valor_unitario:
            l.valor_unitario.trim() || !Number.isFinite(custo) || custo <= 0
              ? l.valor_unitario
              : custo.toFixed(2).replace(".", ","),
        };
      })
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

  const somaItens = linhas.reduce((soma, linha) => soma + subtotalDe(linha), 0);
  const total = somaItens + (Number.isFinite(frete) ? frete : 0);

  const itensJson = JSON.stringify(
    linhas.map((linha) => {
      const qtd = paraNumero(linha.quantidade);
      const valor = paraNumero(linha.valor_unitario);
      return {
        item_id: linha.item_id,
        descricao: linha.descricao.trim(),
        quantidade: Number.isFinite(qtd) ? qtd : 0,
        valor_unitario: Number.isFinite(valor) ? valor : 0,
        lote: linha.lote.trim(),
        validade: linha.validade,
      };
    })
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="itens" value={itensJson} />

      <ul className="space-y-3">
        {linhas.map((linha, indice) => {
          const qtd = paraNumero(linha.quantidade);
          const valor = paraNumero(linha.valor_unitario);
          const produto = produtos.find((p) => p.id === linha.item_id);

          const erroDescricao =
            foiTocado(linha.chave, "descricao") && !linha.descricao.trim()
              ? "Informe a descrição do item."
              : null;
          const erroQuantidade = foiTocado(linha.chave, "quantidade")
            ? !Number.isFinite(qtd) || qtd <= 0
              ? "Quantidade inválida. Use um número maior que zero."
              : qtd > QTD_MAX
                ? `Quantidade máxima: ${QTD_MAX}.`
                : null
            : null;
          const erroValor = foiTocado(linha.chave, "valor_unitario")
            ? !Number.isFinite(valor) || valor < 0
              ? "Valor unitário inválido. Use números, como 120 ou 89,90."
              : valor > VALOR_MAX
                ? "Valor unitário máximo: R$ 9.999.999,99."
                : null
            : null;
          const erroLinha = erroDescricao ?? erroQuantidade ?? erroValor;

          return (
            <li
              key={linha.chave}
              className="rounded-xl border border-edge bg-white/5 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  Item {indice + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Remover item ${indice + 1}`}
                  title="Remover item"
                  disabled={linhas.length === 1}
                  onClick={() => remover(linha.chave)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-red-400/25 hover:text-red-100 disabled:pointer-events-none disabled:opacity-40"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    Produto do catálogo
                  </span>
                  <Select
                    aria-label="Produto do catálogo"
                    value={linha.item_id}
                    onChange={(e) => escolherProduto(linha.chave, e.target.value)}
                  >
                    <option value="">Sem vínculo (não entra no estoque)</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo ? `${p.codigo} · ${p.nome}` : p.nome}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    Descrição na nota
                  </span>
                  <Input
                    aria-label="Descrição do item"
                    placeholder="Ex.: Ração premium 15 kg"
                    required
                    maxLength={200}
                    aria-invalid={!!erroDescricao}
                    value={linha.descricao}
                    onChange={(e) => atualizar(linha.chave, "descricao", e.target.value)}
                    onBlur={() => marcarTocado(linha.chave, "descricao")}
                  />
                </label>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[6rem_9rem_1fr_10rem_auto] sm:items-end">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    Qtd
                  </span>
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
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    Custo unit. (R$)
                  </span>
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
                    // O campo já vem preenchido com o custo do catálogo. Sem
                    // selecionar o conteúdo ao focar, o clique deixa o cursor
                    // no fim e digitar 42,50 sobre 45,00 produzia
                    // "45,0042,50". Selecionado, digitar substitui.
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) =>
                      atualizar(
                        linha.chave,
                        "valor_unitario",
                        sanitizarNumero(e.target.value, VALOR_MAX_CHARS)
                      )
                    }
                    onBlur={() => marcarTocado(linha.chave, "valor_unitario")}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    Lote (opcional)
                  </span>
                  <Input
                    aria-label="Código do lote"
                    placeholder="Ex.: L2026A"
                    maxLength={40}
                    value={linha.lote}
                    onChange={(e) => atualizar(linha.chave, "lote", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    Validade (opcional)
                  </span>
                  <CampoData
                    aria-label="Validade do lote"
                    value={linha.validade}
                    onChange={(valor) => atualizar(linha.chave, "validade", valor)}
                  />
                </label>

                <div className="col-span-2 text-right sm:col-span-1 sm:pb-2.5">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    Subtotal
                  </span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatBRL(subtotalDe(linha))}
                  </span>
                </div>
              </div>

              {produto && !produto.controla_estoque && (
                <p className="mt-2 text-xs text-ink-muted">
                  “{produto.nome}” não controla estoque. A entrada só atualiza o
                  preço de custo.
                </p>
              )}

              {erroLinha && (
                <p className="mt-2 text-xs font-medium text-red-100" role="alert">
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
        <div className="text-right">
          <p className="text-xs text-ink-muted tabular-nums">
            Itens {formatBRL(somaItens)} + frete {formatBRL(frete)}
          </p>
          <p className="flex items-baseline justify-end gap-2">
            <span className="text-sm text-ink-muted">TOTAL</span>
            <span className="text-lg font-bold text-ink tabular-nums">
              {formatBRL(total)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
