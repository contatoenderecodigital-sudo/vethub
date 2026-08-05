"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { hojeISO } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { criarAssinatura } from "../actions";
import { mascaraMoeda, moedaDoBanco } from "../schema";

export interface OpcaoPlano {
  id: string;
  nome: string;
  preco_venda: number;
}

/**
 * Formulário de nova assinatura. Escolher o plano sugere o valor mensal
 * (preço do plano no catálogo), mas o campo continua editável — clínica
 * negocia valor com o cliente o tempo todo.
 */
export function AssinaturaForm({
  planos,
  planoInicial,
  tutorInicial,
  petInicial,
  erro,
}: {
  planos: OpcaoPlano[];
  planoInicial?: string;
  tutorInicial?: OpcaoBusca;
  petInicial?: OpcaoBusca;
  erro?: string;
}) {
  const inicial = planos.find((p) => p.id === planoInicial);
  const [planoId, setPlanoId] = useState(inicial?.id ?? "");
  const [valor, setValor] = useState(() => moedaDoBanco(inicial?.preco_venda));

  function escolherPlano(id: string) {
    setPlanoId(id);
    const plano = planos.find((p) => p.id === id);
    if (plano) setValor(moedaDoBanco(plano.preco_venda));
  }

  return (
    <form action={criarAssinatura} className="space-y-4">
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100" role="alert">
          {erro}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tutor" htmlFor="assinatura-tutor" obrigatorio>
          <BuscaCombobox
            id="assinatura-tutor"
            name="tutor_id"
            endpoint="/api/busca/tutores"
            placeholder="Buscar tutor pelo nome…"
            valorInicial={tutorInicial}
            obrigatorio
          />
        </Campo>

        <Campo
          rotulo="Pet"
          htmlFor="assinatura-pet"
          dica="Opcional — planos por pet ficam mais fáceis de controlar"
        >
          <BuscaCombobox
            id="assinatura-pet"
            name="pet_id"
            endpoint="/api/busca/pets"
            placeholder="Buscar pet pelo nome…"
            valorInicial={petInicial}
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Plano" htmlFor="plano_item_id" obrigatorio>
          <Select
            id="plano_item_id"
            name="plano_item_id"
            required
            value={planoId}
            onChange={(e) => escolherPlano(e.target.value)}
          >
            <option value="">Escolha o plano</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo
          rotulo="Valor mensal (R$)"
          htmlFor="valor_mensal"
          obrigatorio
          dica="Sugerido pelo plano — pode ser ajustado"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Dia da cobrança"
          htmlFor="dia_cobranca"
          obrigatorio
          dica="De 1 a 28, para o dia existir em todos os meses"
        >
          <Input
            id="dia_cobranca"
            name="dia_cobranca"
            type="number"
            min={1}
            max={28}
            step={1}
            required
            defaultValue={5}
          />
        </Campo>

        <Campo rotulo="Início" htmlFor="inicio" obrigatorio>
          <Input
            id="inicio"
            name="inicio"
            type="date"
            required
            defaultValue={hojeISO()}
          />
        </Campo>
      </div>

      <Campo rotulo="Observação" htmlFor="observacao">
        <Textarea
          id="observacao"
          name="observacao"
          className="min-h-20"
          maxLength={500}
          placeholder="Combinados com o tutor, condições especiais…"
        />
      </Campo>

      <div className="flex gap-2 pt-2">
        <SubmitButton>
          <Check className="size-4" />
          Criar assinatura
        </SubmitButton>
        <ButtonLink href="/planos/assinaturas" variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
