import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { ConsultaForm } from "../consulta-form";
import { criarConsulta } from "../actions";

export const metadata = { title: "Nova consulta" };

interface PetBuscado {
  id: string;
  nome: string;
  especie: string;
  tutor: { nome: string } | { nome: string }[] | null;
}

export default async function NovaConsultaPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string; agendamento?: string; erro?: string }>;
}) {
  const { pet, agendamento, erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  if (usuario.papel === "recepcao") redirect("/agenda");

  let petInicial: OpcaoBusca | undefined;
  if (pet) {
    const { data } = await supabase
      .from("pet")
      .select("id, nome, especie, tutor:tutor_id (nome)")
      .eq("id", pet)
      .single<PetBuscado>();
    if (data) {
      const tutor = Array.isArray(data.tutor) ? data.tutor[0] : data.tutor;
      petInicial = {
        id: data.id,
        rotulo: data.nome,
        detalhe: tutor ? `Tutor: ${tutor.nome}` : undefined,
      };
    }
  }

  const { data: veterinarios } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("papel", ["veterinario", "admin"])
    .order("nome")
    .returns<{ id: string; nome: string }[]>();

  const vetPadrao = veterinarios?.some((v) => v.id === usuario.id)
    ? usuario.id
    : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Nova consulta" subtitulo="Registro de atendimento" />
      <Card>
        <ConsultaForm
          action={criarConsulta}
          veterinarios={veterinarios ?? []}
          vetPadrao={vetPadrao}
          petInicial={petInicial}
          agendamentoId={agendamento}
          cancelarHref={pet ? `/pets/${pet}` : "/agenda"}
          erro={erro}
        />
      </Card>
    </div>
  );
}
