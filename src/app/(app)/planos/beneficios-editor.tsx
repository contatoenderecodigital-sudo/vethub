"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { MAX_BENEFICIOS, QUANTIDADE_MAXIMA, sanitizarInteiro } from "./schema";

/** Item do catálogo (serviço ou produto) que pode virar benefício. */
export interface OpcaoItemBeneficio {
  id: string;
  nome: string;
  tipo: string;
}

export interface BeneficioInicial {
  item_id: string | null;
  descricao: string;
  quantidade_mes: number;
  desconto_percentual: number | null;
}

interface Linha {
  chave: string;
  item_id: string;
  descricao: string;
  quantidade_mes: string;
  desconto_percentual: string;
}

type Campo = keyof Omit<Linha, "chave">;

/**
 * Editor dinâmico dos benefícios do plano. Mantém um input hidden
 * name="beneficios" com o JSON já normalizado (números de verdade) para a
 * server action, que revalida linha a linha com zod.
 */
export function BeneficiosEditor({
  itens,
  iniciais,
}: {
  itens: OpcaoItemBeneficio[];
  iniciais?: BeneficioInicial[];
}) {
  const novaLinha = (): Linha => ({
    chave: crypto.randomUUID(),
    item_id: "",
    descricao: "",
    quantidade_mes: "1",
    desconto_percentual: "0",
  });

  const [linhas, setLinhas] = useState<Linha[]>(() =>
    iniciais && iniciais.length > 0
      ? iniciais.map((b) => ({
          chave: crypto.randomUUID(),
          item_id: b.item_id ?? "",
          descricao: b.descricao,
          quantidade_mes: String(b.quantidade_mes ?? 1),
          desconto_percentual: String(Number(b.desconto_percentual ?? 0)),
        }))
      : [novaLinha()]
  );

  function atualizar(chave: string, campo: Campo, valor: string) {
    setLinhas((atual) =>
      atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l))
    );
  }

  /** Escolher o item preenche a descrição quando ela ainda está vazia. */
  function escolherItem(chave: string, itemId: string) {
    const nome = itens.find((i) => i.id === itemId)?.nome ?? "";
    setLinhas((atual) =>
      atual.map((l) =>
        l.chave === chave
          ? {
              ...l,
              item_id: itemId,
              descricao: l.descricao.trim() ? l.descricao : nome,
            }
          : l
      )
    );
  }

  function remover(chave: string) {
    setLinhas((atual) =>
      atual.length > 1 ? atual.filter((l) => l.chave !== chave) : atual
    );
  }

  const beneficiosJson = JSON.stringify(
    linhas.map((l) => ({
      item_id: l.item_id,
      descricao: l.descricao.trim(),
      quantidade_mes: Number(l.quantidade_mes || "0"),
      desconto_percentual: Number(l.desconto_percentual || "0"),
    }))
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="beneficios" value={beneficiosJson} />

      {/* Cabeçalho das colunas (desktop) — mesma grade das linhas */}
      <div className="hidden text-xs font-medium text-ink-muted sm:grid sm:grid-cols-[14rem_minmax(0,1fr)_6rem_6rem_2rem] sm:gap-2">
        <span>Serviço ou produto</span>
        <span>Descrição do benefício</span>
        <span>Vezes/mês</span>
        <span>Desconto (%)</span>
        <span />
      </div>

      <ul className="space-y-3 sm:space-y-2">
        {linhas.map((linha) => (
          <li
            key={linha.chave}
            className="rounded-lg border border-edge p-2 sm:rounded-none sm:border-0 sm:p-0"
          >
            <div className="space-y-2 sm:grid sm:grid-cols-[14rem_minmax(0,1fr)_6rem_6rem_2rem] sm:items-center sm:gap-2 sm:space-y-0">
              <label className="block sm:contents">
                <span className="mb-1 block text-[11px] font-medium text-ink-muted sm:hidden">
                  Serviço ou produto
                </span>
                <Select
                  aria-label="Serviço ou produto do catálogo"
                  value={linha.item_id}
                  onChange={(e) => escolherItem(linha.chave, e.target.value)}
                >
                  <option value="">Sem item do catálogo</option>
                  {itens.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block sm:contents">
                <span className="mb-1 block text-[11px] font-medium text-ink-muted sm:hidden">
                  Descrição do benefício
                </span>
                <Input
                  aria-label="Descrição do benefício"
                  placeholder="Ex.: Banho completo"
                  required
                  maxLength={200}
                  value={linha.descricao}
                  onChange={(e) =>
                    atualizar(linha.chave, "descricao", e.target.value)
                  }
                />
              </label>

              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:contents">
                <label className="block sm:contents">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted sm:hidden">
                    Vezes/mês
                  </span>
                  <Input
                    aria-label="Quantidade por mês"
                    inputMode="numeric"
                    required
                    title={`De 1 a ${QUANTIDADE_MAXIMA} vezes por mês.`}
                    value={linha.quantidade_mes}
                    onChange={(e) =>
                      atualizar(
                        linha.chave,
                        "quantidade_mes",
                        sanitizarInteiro(e.target.value, 3)
                      )
                    }
                  />
                </label>

                <label className="block sm:contents">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted sm:hidden">
                    Desconto (%)
                  </span>
                  <Input
                    aria-label="Desconto percentual no que passar da franquia"
                    inputMode="numeric"
                    title="Desconto de 0 a 100% no que passar da franquia do mês."
                    value={linha.desconto_percentual}
                    onChange={(e) =>
                      atualizar(
                        linha.chave,
                        "desconto_percentual",
                        sanitizarInteiro(e.target.value, 3)
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  aria-label="Remover benefício"
                  title="Remover benefício"
                  disabled={linhas.length === 1}
                  onClick={() => remover(linha.chave)}
                  className="mb-1 flex size-8 shrink-0 cursor-pointer items-center justify-center justify-self-end rounded-md text-ink-muted transition-colors hover:bg-red-400/25 hover:text-red-100 disabled:pointer-events-none disabled:opacity-40 sm:mb-0"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
        <Button
          type="button"
          variante="secondary"
          tamanho="sm"
          disabled={linhas.length >= MAX_BENEFICIOS}
          onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
        >
          <Plus className="size-4" />
          Adicionar benefício
        </Button>
        <p className="text-xs text-ink-muted">
          {linhas.length} de {MAX_BENEFICIOS} benefícios
        </p>
      </div>
    </div>
  );
}
