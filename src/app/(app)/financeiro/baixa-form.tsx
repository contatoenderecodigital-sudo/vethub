"use client";

import { useState } from "react";
import { CircleCheckBig, X } from "lucide-react";
import { formatBRL, hojeISO } from "@/lib/format";
import { FORMAS_PAGAMENTO, type ContaTipo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Campo, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { darBaixa } from "./actions";
import { mascaraMoeda } from "./schema";

/**
 * Baixa rápida direto na lista: abre embaixo da linha já com o saldo restante
 * preenchido e a data de hoje — o caso comum é um clique e "Confirmar".
 * O servidor revalida tudo (zod) e decide entre 'parcial' e 'paga'.
 */
export function BaixaForm({
  contaId,
  tipo,
  saldo,
  voltar,
}: {
  contaId: string;
  tipo: ContaTipo;
  saldo: number;
  voltar: string;
}) {
  const [aberto, setAberto] = useState(false);
  // saldo em centavos passa pela mesma máscara do formulário: 150 → "150,00"
  const [valor, setValor] = useState(() =>
    mascaraMoeda(String(Math.round(saldo * 100)))
  );

  if (!aberto) {
    return (
      <Button
        type="button"
        variante="secondary"
        tamanho="sm"
        className="min-h-11 sm:min-h-10"
        onClick={() => setAberto(true)}
      >
        <CircleCheckBig className="size-4" />
        Dar baixa
      </Button>
    );
  }

  return (
    /* largura fixa no desktop: o form empurra a linha inteira e não fica espremido */
    <form
      action={darBaixa.bind(null, contaId, voltar)}
      className="w-full rounded-xl border border-edge bg-white/10 p-3 sm:w-[30rem]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">
          {tipo === "receber" ? "Registrar recebimento" : "Registrar pagamento"}
          <span className="ml-2 font-normal text-ink-muted">
            saldo de {formatBRL(saldo)}
          </span>
        </p>
        <button
          type="button"
          aria-label="Fechar baixa"
          onClick={() => setAberto(false)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Valor (R$)" htmlFor={`baixa-valor-${contaId}`} obrigatorio>
          <Input
            id={`baixa-valor-${contaId}`}
            name="valor_pago"
            inputMode="decimal"
            placeholder="0,00"
            required
            autoComplete="off"
            value={valor}
            onChange={(e) => setValor(mascaraMoeda(e.target.value))}
          />
        </Campo>

        <Campo rotulo="Data" htmlFor={`baixa-data-${contaId}`} obrigatorio>
          <Input
            id={`baixa-data-${contaId}`}
            name="pagamento"
            type="date"
            required
            defaultValue={hojeISO()}
          />
        </Campo>

        <Campo rotulo="Forma" htmlFor={`baixa-forma-${contaId}`}>
          <Select id={`baixa-forma-${contaId}`} name="forma_pagamento" defaultValue="">
            <option value="">Não informada</option>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        Valor menor que o saldo deixa a conta como parcial.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SubmitButton tamanho="sm" carregando="Salvando…" className="min-h-11 sm:min-h-10">
          Confirmar baixa
        </SubmitButton>
        <Button
          type="button"
          variante="ghost"
          tamanho="sm"
          className="min-h-11 sm:min-h-10"
          onClick={() => setAberto(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
