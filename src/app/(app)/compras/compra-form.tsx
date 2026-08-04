"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { CompraItensEditor, type ProdutoOpcao } from "./itens-editor";

export interface FornecedorOpcao {
  id: string;
  nome: string;
}

const PATTERN_VALOR = "\\d{1,3}(\\.\\d{3})*(,\\d{1,2})?|\\d+([.,]\\d+)?";

function paraNumero(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Cabeçalho da nota + editor de itens. O frete vive aqui porque entra no
 * total geral que o editor mostra no rodapé (e o trigger do banco soma
 * exatamente do mesmo jeito: itens + frete).
 */
export function CompraForm({
  action,
  fornecedores,
  produtos,
  dataInicial,
  fornecedorInicial,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  fornecedores: FornecedorOpcao[];
  produtos: ProdutoOpcao[];
  /** Hoje em São Paulo, calculado no servidor para não divergir na hidratação. */
  dataInicial: string;
  fornecedorInicial?: string;
  erro?: string;
}) {
  const [frete, setFrete] = useState("");

  return (
    <form action={action} className="space-y-4">
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Fornecedor" htmlFor="fornecedor_id" obrigatorio>
          <Select
            id="fornecedor_id"
            name="fornecedor_id"
            defaultValue={fornecedorInicial ?? ""}
            required
          >
            <option value="">Selecione…</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Número da nota" htmlFor="numero_nota" dica="Opcional">
          <Input
            id="numero_nota"
            name="numero_nota"
            maxLength={40}
            placeholder="Ex.: 001234"
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data da compra" htmlFor="data" obrigatorio>
          <Input id="data" name="data" type="date" defaultValue={dataInicial} required />
        </Campo>

        <Campo
          rotulo="Frete (R$)"
          htmlFor="frete"
          dica="Entra no total da nota e na conta a pagar"
        >
          <Input
            id="frete"
            name="frete"
            inputMode="decimal"
            placeholder="0,00"
            pattern={PATTERN_VALOR}
            maxLength={12}
            title="Use apenas números, com vírgula para os centavos (ex.: 89,90)."
            value={frete}
            onChange={(e) => setFrete(e.target.value.replace(/[^\d.,]/g, "").slice(0, 12))}
          />
        </Campo>
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-ink">
          Itens da nota<span className="text-red-100"> *</span>
        </span>
        <p className="text-xs text-ink-muted">
          Vincule cada linha a um produto do catálogo para a mercadoria entrar no
          estoque quando a compra for recebida.
        </p>
        <CompraItensEditor produtos={produtos} frete={paraNumero(frete)} />
      </div>

      <Campo rotulo="Observação" htmlFor="observacao" dica="Opcional">
        <Textarea id="observacao" name="observacao" maxLength={500} />
      </Campo>

      <div className="flex gap-2 pt-2">
        <SubmitButton carregando="Lançando…">
          <Check className="size-4" />
          Lançar compra
        </SubmitButton>
        <ButtonLink href="/compras" variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
