"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Campo, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { sanitizarNumero } from "../itens/formato";
import { cadastrarLote } from "./actions";
import type { ProdutoOpcao } from "./movimentacao-form";

/**
 * Cadastro de lote com validade. A quantidade inicial vira uma
 * movimentação de entrada — é ela que alimenta o saldo do lote e do
 * produto (o trigger do banco faz a conta).
 */
export function LoteForm({
  produtos,
  anoLimite,
}: {
  produtos: ProdutoOpcao[];
  anoLimite: number;
}) {
  const [quantidade, setQuantidade] = useState("");

  return (
    <form action={cadastrarLote} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          rotulo="Produto"
          htmlFor="lote-item"
          obrigatorio
          className="sm:col-span-2"
        >
          <Select id="lote-item" name="item_id" required defaultValue="">
            <option value="" disabled>
              Selecione o produto…
            </option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo ? `${p.nome} (${p.codigo})` : p.nome}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Código do lote" htmlFor="lote-codigo" obrigatorio>
          <Input
            id="lote-codigo"
            name="codigo"
            required
            maxLength={40}
            autoComplete="off"
            placeholder="Ex.: L23A4501"
          />
        </Campo>

        <Campo rotulo="Validade" htmlFor="lote-validade" obrigatorio>
          <Input
            id="lote-validade"
            name="validade"
            type="date"
            required
            min="2000-01-01"
            max={`${anoLimite}-12-31`}
          />
        </Campo>

        <Campo
          rotulo="Quantidade inicial"
          htmlFor="lote-quantidade"
          obrigatorio
          dica="Entra como movimentação de entrada no estoque."
        >
          <Input
            id="lote-quantidade"
            name="quantidade"
            inputMode="decimal"
            placeholder="0"
            required
            autoComplete="off"
            value={quantidade}
            onChange={(e) => setQuantidade(sanitizarNumero(e.target.value, 10))}
          />
        </Campo>
      </div>

      <SubmitButton carregando="Cadastrando…">
        <Plus className="size-4" />
        Cadastrar lote
      </SubmitButton>
    </form>
  );
}
