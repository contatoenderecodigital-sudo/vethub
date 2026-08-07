"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { TIPOS_MOVIMENTACAO } from "@/lib/types";
import { Campo, Input, Select } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { SubmitButton } from "@/components/ui/submit-button";
import { mascaraMoeda, sanitizarNumero } from "../itens/formato";
import { registrarMovimentacao } from "./actions";

export interface ProdutoOpcao {
  id: string;
  nome: string;
  codigo: string | null;
  sigla: string | null;
}

/**
 * Movimentação manual de estoque. A quantidade sempre entra positiva:
 * é o tipo que decide se soma ou subtrai. O saldo em si é recalculado
 * por um trigger no banco, nunca por este formulário.
 */
export function MovimentacaoForm({
  produtos,
  itemInicial,
}: {
  produtos: ProdutoOpcao[];
  itemInicial?: string;
}) {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [quantidade, setQuantidade] = useState("");
  const [valor, setValor] = useState("");

  return (
    <form action={registrarMovimentacao} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          rotulo="Produto"
          htmlFor="mov-item"
          obrigatorio
          className="sm:col-span-2"
        >
          <Select
            id="mov-item"
            name="item_id"
            required
            defaultValue={itemInicial ?? ""}
          >
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

        <Campo rotulo="Tipo" htmlFor="mov-tipo" obrigatorio>
          <Select id="mov-tipo" name="tipo" defaultValue="entrada" required>
            {TIPOS_MOVIMENTACAO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo} · {t.dica}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo
          rotulo="Quantidade"
          htmlFor="mov-quantidade"
          obrigatorio
          dica="Sempre positiva. O tipo define se soma ou subtrai."
        >
          <Input
            id="mov-quantidade"
            name="quantidade"
            inputMode="decimal"
            placeholder="0"
            required
            autoComplete="off"
            value={quantidade}
            onChange={(e) => setQuantidade(sanitizarNumero(e.target.value, 10))}
          />
        </Campo>

        <Campo
          rotulo="Valor unitário (R$)"
          htmlFor="mov-valor"
          dica="Opcional. Útil nas entradas de compra."
        >
          <Input
            id="mov-valor"
            name="valor_unitario"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            value={valor}
            onChange={(e) => setValor(mascaraMoeda(e.target.value))}
          />
        </Campo>

        <Campo
          rotulo="Lote"
          htmlFor="mov-lote"
          dica="Opcional. Na entrada, um lote novo é criado se ainda não existir."
        >
          <Input
            id="mov-lote"
            name="lote_codigo"
            maxLength={40}
            autoComplete="off"
            placeholder="Código do lote"
          />
        </Campo>

        {/* Lote criado por aqui nascia SEM validade e nunca aparecia no
            Controle de validade — estoque vencendo sem ninguém ser avisado.
            Era o furo do terceiro caminho de criar lote: compras pedia a
            validade, esta tela não. */}
        <Campo
          rotulo="Validade do lote"
          htmlFor="mov-validade"
          dica="Só na entrada. É o que alimenta o Controle de validade."
        >
          <CampoData id="mov-validade" name="lote_validade" min={hoje} />
        </Campo>

        <Campo rotulo="Motivo" htmlFor="mov-motivo" className="sm:col-span-2">
          <Input
            id="mov-motivo"
            name="motivo"
            maxLength={200}
            placeholder="Ex.: compra do fornecedor, uso na consulta do Thor, frasco quebrado…"
          />
        </Campo>
      </div>

      <SubmitButton carregando="Registrando…">
        <ArrowLeftRight className="size-4" />
        Registrar movimentação
      </SubmitButton>
    </form>
  );
}
