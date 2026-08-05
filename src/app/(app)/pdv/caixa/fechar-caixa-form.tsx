"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Campo, Input } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { fecharCaixa } from "../actions";
import { mascaraMoeda, numeroOuZero } from "../numeros";

/**
 * Conferência do caixa: o operador digita o que contou na gaveta e vê na hora
 * se sobrou ou faltou. O servidor revalida o valor com zod ao fechar.
 */
export function FecharCaixaForm({
  caixaId,
  dinheiroEsperado,
}: {
  caixaId: string;
  dinheiroEsperado: number;
}) {
  const [contado, setContado] = useState("");

  const informou = contado.trim() !== "";
  const diferenca = Math.round((numeroOuZero(contado) - dinheiroEsperado) * 100) / 100;

  const tom =
    !informou || diferenca === 0
      ? "text-ink"
      : diferenca > 0
        ? "text-emerald-50"
        : "text-red-50";

  const rotuloDiferenca = !informou
    ? "Informe o valor contado"
    : diferenca === 0
      ? "Bate certinho"
      : diferenca > 0
        ? `Sobra de ${formatBRL(diferenca)}`
        : `Falta de ${formatBRL(Math.abs(diferenca))}`;

  return (
    <form action={fecharCaixa.bind(null, caixaId)} className="space-y-3">
      <Campo
        rotulo="Valor contado na gaveta (R$)"
        htmlFor="valor_fechamento"
        obrigatorio
        dica={`Esperado em dinheiro: ${formatBRL(dinheiroEsperado)}`}
      >
        <Input
          id="valor_fechamento"
          name="valor_fechamento"
          inputMode="decimal"
          placeholder="0,00"
          autoComplete="off"
          required
          value={contado}
          onChange={(e) => setContado(mascaraMoeda(e.target.value))}
        />
      </Campo>

      <div className="rounded-xl bg-white/15 px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Diferença
        </p>
        <p className={`text-xl font-bold tabular-nums ${tom}`}>{rotuloDiferenca}</p>
      </div>

      <Campo rotulo="Observação" htmlFor="observacao">
        <Input
          id="observacao"
          name="observacao"
          maxLength={300}
          placeholder="Opcional. Ex.: sangria de R$ 200 às 15h"
        />
      </Campo>

      <ConfirmButton
        className="w-full"
        tamanho="lg"
        mensagem="Fechar o caixa encerra o turno e bloqueia novas vendas até uma nova abertura. Confirma?"
      >
        <LockKeyhole className="size-4" />
        Fechar caixa
      </ConfirmButton>
    </form>
  );
}
