import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { InternacaoForm } from "../internacao-form";
import { internarPet } from "../actions";

export const metadata = { title: "Nova internação" };

interface PetBuscado {
  id: string;
  nome: string;
  especie: string;
  tutor: { nome: string } | { nome: string }[] | null;
}

export default async function NovaInternacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string; erro?: string }>;
}) {
  const { pet, erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

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
    : "";

  // Data e hora "agora" calculadas no servidor, no fuso da clínica
  // (evita divergência de hidratação com o relógio do navegador).
  const agora = new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Nova internação"
        subtitulo="Entrada do paciente no internamento"
      />
      <Card>
        <InternacaoForm
          action={internarPet}
          valoresIniciais={{
            pet_id: petInicial?.id ?? "",
            veterinario_id: vetPadrao,
            box: "",
            data: hojeISO(),
            hora: agora,
            motivo: "",
            diagnostico: "",
            observacoes: "",
          }}
          veterinarios={veterinarios ?? []}
          petInicial={petInicial}
          cancelarHref="/internacao"
          erro={erro}
        />
      </Card>
    </div>
  );
}
