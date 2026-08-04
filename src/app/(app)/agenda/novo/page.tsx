import { getSessao } from "@/lib/auth";
import { dataParamOuHoje } from "@/lib/validacao";
import type { Pet, Usuario } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { criarAgendamento } from "../actions";
import { AgendamentoForm } from "../agendamento-form";

export const metadata = { title: "Novo agendamento" };

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string; data?: string; erro?: string }>;
}) {
  const { pet, data, erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: veterinarios } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("papel", ["veterinario", "admin"])
    .order("nome")
    .returns<Pick<Usuario, "id" | "nome">[]>();

  // Pet pré-selecionado (ex.: vindo da ficha do pet via ?pet=).
  let petInicial: OpcaoBusca | undefined;
  if (pet) {
    const { data: p } = await supabase
      .from("pet")
      .select("id, nome, especie")
      .eq("id", pet)
      .single<Pick<Pet, "id" | "nome" | "especie">>();
    if (p) {
      petInicial = { id: p.id, rotulo: p.nome, detalhe: p.especie };
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Novo agendamento" />
      <Card>
        <AgendamentoForm
          action={criarAgendamento}
          veterinarios={veterinarios ?? []}
          petInicial={petInicial}
          dataInicial={dataParamOuHoje(data)}
          erro={erro}
        />
      </Card>
    </div>
  );
}
