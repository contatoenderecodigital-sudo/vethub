import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { ReceitaForm } from "../receita-form";
import { criarReceita } from "../actions";

export const metadata = { title: "Nova receita" };

interface PetBuscado {
  id: string;
  nome: string;
  especie: string;
  tutor: { nome: string } | { nome: string }[] | null;
}

export default async function NovaReceitaPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string; consulta?: string; erro?: string }>;
}) {
  const { pet, consulta, erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  // Recepção não prescreve (a server action também bloqueia).
  if (usuario.papel === "recepcao") redirect("/receitas");

  // ?pet= vindo do prontuário/ficha do pet já deixa o paciente selecionado.
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
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Nova receita"
        subtitulo="Prescrição para impressão e entrega ao tutor"
      />
      <Card>
        <ReceitaForm
          action={criarReceita}
          veterinarios={veterinarios ?? []}
          vetPadrao={vetPadrao}
          petInicial={petInicial}
          consultaId={consulta}
          cancelarHref={
            consulta ? `/consultas/${consulta}` : pet ? `/pets/${pet}` : "/receitas"
          }
          textoBotao="Criar receita"
          erro={erro}
        />
      </Card>
    </div>
  );
}
