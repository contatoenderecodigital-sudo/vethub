"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Campo, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  BeneficiosEditor,
  type BeneficioInicial,
  type OpcaoItemBeneficio,
} from "./beneficios-editor";
import { mascaraMoeda, moedaDoBanco } from "./schema";

const CAIXA =
  "flex items-start gap-2 rounded-lg border border-white/25 bg-white/10 p-3 text-sm text-ink-muted";

interface PlanoInicial {
  nome: string;
  descricao: string | null;
  preco_venda: number;
  ativo: boolean;
}

/**
 * Formulário do plano (criar/editar): os dados viram um `item` com
 * tipo='plano' e as linhas viram `plano_beneficio`. O servidor revalida
 * tudo com o mesmo schema zod.
 */
export function PlanoForm({
  action,
  itens,
  plano,
  beneficios,
  cancelarHref,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  itens: OpcaoItemBeneficio[];
  plano?: PlanoInicial;
  beneficios?: BeneficioInicial[];
  cancelarHref: string;
  erro?: string;
}) {
  const [valor, setValor] = useState(() => moedaDoBanco(plano?.preco_venda));

  return (
    <form action={action} className="space-y-4">
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100" role="alert">
          {erro}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Campo rotulo="Nome do plano" htmlFor="nome" obrigatorio>
          <Input
            id="nome"
            name="nome"
            required
            maxLength={120}
            defaultValue={plano?.nome ?? ""}
            placeholder="Ex.: Plano Banho Mensal"
          />
        </Campo>

        <Campo
          rotulo="Valor mensal (R$)"
          htmlFor="valor_mensal"
          obrigatorio
          dica="Cobrado todo mês do tutor"
        >
          <Input
            id="valor_mensal"
            name="valor_mensal"
            inputMode="decimal"
            placeholder="0,00"
            required
            autoComplete="off"
            value={valor}
            onChange={(e) => setValor(mascaraMoeda(e.target.value))}
          />
        </Campo>
      </div>

      <Campo
        rotulo="Descrição"
        htmlFor="descricao"
        dica="O que o tutor ganha ao assinar — aparece na proposta e na ficha do plano."
      >
        <Textarea
          id="descricao"
          name="descricao"
          className="min-h-20"
          maxLength={1000}
          defaultValue={plano?.descricao ?? ""}
          placeholder="Ex.: 4 banhos + 1 tosa higiênica por mês, com 10% de desconto nos serviços extras."
        />
      </Campo>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-ink">
          Benefícios incluídos<span className="text-red-100"> *</span>
        </span>
        <p className="text-xs text-ink-muted">
          Cada linha é uma franquia mensal. O desconto vale para o que passar
          da franquia.
        </p>
        <BeneficiosEditor itens={itens} iniciais={beneficios} />
      </div>

      <label className={CAIXA}>
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={plano?.ativo ?? true}
          className="mt-0.5 size-4 accent-[#34D399]"
        />
        <span>Plano ativo (aparece na hora de criar uma assinatura).</span>
      </label>

      <div className="flex gap-2 pt-2">
        <SubmitButton>
          <Check className="size-4" />
          Salvar plano
        </SubmitButton>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
