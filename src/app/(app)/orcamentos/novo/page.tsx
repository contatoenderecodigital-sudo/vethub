import { Check } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Campo } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { ItensEditor } from "../itens-editor";
import { criarOrcamento } from "../actions";

export const metadata = { title: "Novo orçamento" };

interface PetSelecionado {
  id: string;
  nome: string;
  especie: string;
  tutor: { nome: string } | { nome: string }[] | null;
}

export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string; consulta?: string; erro?: string }>;
}) {
  const { pet, consulta, erro } = await searchParams;
  const { supabase } = await getSessao();

  // Pré-seleciona o pet quando a página é aberta com ?pet= (ex.: vindo da consulta).
  let valorInicial: OpcaoBusca | undefined;
  if (pet) {
    const { data } = await supabase
      .from("pet")
      .select("id, nome, especie, tutor:tutor_id (nome)")
      .eq("id", pet)
      .single<PetSelecionado>();
    if (data) {
      const tutor = Array.isArray(data.tutor) ? data.tutor[0] : data.tutor;
      valorInicial = {
        id: data.id,
        rotulo: data.nome,
        detalhe: tutor ? `Tutor: ${tutor.nome}` : undefined,
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Novo orçamento" />
      <Card>
        <form action={criarOrcamento} className="space-y-4">
          {erro && (
            <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
              {erro}
            </p>
          )}

          {consulta && (
            <input type="hidden" name="consulta_id" value={consulta} />
          )}

          <Campo rotulo="Pet" htmlFor="pet_id" obrigatorio>
            <BuscaCombobox
              id="pet_id"
              name="pet_id"
              endpoint="/api/busca/pets"
              placeholder="Buscar pet pelo nome…"
              valorInicial={valorInicial}
              obrigatorio
            />
          </Campo>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink">
              Itens do orçamento<span className="text-red-100"> *</span>
            </span>
            <ItensEditor />
          </div>

          <div className="flex gap-2 pt-2">
            <SubmitButton>
              <Check className="size-4" />
              Criar orçamento
            </SubmitButton>
            <ButtonLink href="/orcamentos" variante="secondary">
              Cancelar
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
