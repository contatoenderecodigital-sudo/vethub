"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { hojeISO } from "@/lib/format";
import { FORMAS_PAGAMENTO, TIPOS_LANCAMENTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Campo, Input, Select } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { SubmitButton } from "@/components/ui/submit-button";
import { registrarLancamento } from "../actions";

/**
 * Máscara de moeda: só dígitos → centavos → "1.234,56".
 * O sinal de menos (inclusive o "−" do teclado numérico) não entra. Quem
 * define crédito ou débito é o tipo do lançamento, não o sinal digitado.
 */
function mascaraMoeda(v: string): string {
  const digitos = v.replace(/[-−–—]/g, "").replace(/\D/g, "").slice(0, 8); // até 999.999,00
  if (!digitos) return "";
  const centavos = (Number(digitos) / 100).toFixed(2);
  const [inteiro, decimal] = centavos.split(".");
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}

/**
 * Formulário inline de lançamento financeiro do tutor. Fica recolhido até o
 * usuário pedir. O card mostra saldo e extrato sem ruído. O servidor
 * revalida tudo de novo (zod) em registrarLancamento.
 */
export function LancamentoForm({ tutorId }: { tutorId: string }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");

  if (!aberto) {
    return (
      <Button
        type="button"
        variante="secondary"
        tamanho="sm"
        onClick={() => setAberto(true)}
      >
        <Plus className="size-4" />
        Novo lançamento
      </Button>
    );
  }

  return (
    <form
      action={registrarLancamento.bind(null, tutorId)}
      className="rounded-xl border border-edge bg-white/10 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Novo lançamento</p>
        <button
          type="button"
          aria-label="Fechar formulário"
          onClick={() => setAberto(false)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Tipo" htmlFor="lanc-tipo" obrigatorio>
          <Select id="lanc-tipo" name="tipo" defaultValue="debito" required>
            {TIPOS_LANCAMENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Valor (R$)" htmlFor="lanc-valor" obrigatorio>
          <Input
            id="lanc-valor"
            name="valor"
            inputMode="decimal"
            placeholder="0,00"
            required
            autoComplete="off"
            value={valor}
            onChange={(e) => setValor(mascaraMoeda(e.target.value))}
          />
        </Campo>

        <Campo
          rotulo="Descrição"
          htmlFor="lanc-descricao"
          obrigatorio
          className="sm:col-span-2"
        >
          <Input
            id="lanc-descricao"
            name="descricao"
            maxLength={200}
            required
            placeholder="Ex.: Consulta do Thor, pagamento do orçamento #12…"
          />
        </Campo>

        <Campo rotulo="Forma de pagamento" htmlFor="lanc-forma">
          <Select id="lanc-forma" name="forma_pagamento" defaultValue="">
            <option value="">Não informada</option>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Data" htmlFor="lanc-data" obrigatorio>
          <CampoData
            id="lanc-data"
            name="data"
            required
            defaultValue={hojeISO()}
          />
        </Campo>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SubmitButton tamanho="sm">Lançar</SubmitButton>
        <Button
          type="button"
          variante="ghost"
          tamanho="sm"
          onClick={() => setAberto(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
