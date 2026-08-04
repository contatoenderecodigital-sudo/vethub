import { notFound, redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { formatDataISO } from "@/lib/format";
import type { ReceitaItem, ReceitaTipo } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { ReceitaForm } from "../../receita-form";
import { atualizarReceita } from "../../actions";
import type { MedicamentoValores } from "../../schema";

export const metadata = { title: "Editar receita" };

interface ReceitaEdicao {
  id: string;
  pet_id: string;
  consulta_id: string | null;
  veterinario_id: string | null;
  tipo: ReceitaTipo;
  data: string;
  orientacoes: string | null;
  retorno_em: string | null;
  pet: {
    id: string;
    nome: string;
    tutor: { nome: string } | { nome: string }[] | null;
  } | null;
}

export default async function EditarReceitaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  if (usuario.papel === "recepcao") redirect(`/receitas/${id}`);

  const { data: receita } = await supabase
    .from("receita")
    .select(
      "id, pet_id, consulta_id, veterinario_id, tipo, data, orientacoes, retorno_em, pet:pet_id (id, nome, tutor:tutor_id (nome))"
    )
    .eq("id", id)
    .single<ReceitaEdicao>();

  if (!receita) notFound();

  const [{ data: itens }, { data: veterinarios }] = await Promise.all([
    supabase
      .from("receita_item")
      .select("*")
      .eq("receita_id", id)
      .order("ordem")
      .returns<ReceitaItem[]>(),
    supabase
      .from("usuario")
      .select("id, nome")
      .in("papel", ["veterinario", "admin"])
      .order("nome")
      .returns<{ id: string; nome: string }[]>(),
  ]);

  // Os itens do banco viram as linhas iniciais do editor ('' no lugar de null).
  const medicamentos: MedicamentoValores[] = (itens ?? []).map((item) => ({
    medicamento: item.medicamento,
    concentracao: item.concentracao ?? "",
    forma_farmaceutica: item.forma_farmaceutica ?? "",
    quantidade: item.quantidade ?? "",
    posologia: item.posologia,
    via: item.via ?? "",
    observacao: item.observacao ?? "",
  }));

  let petInicial: OpcaoBusca | undefined;
  if (receita.pet) {
    const tutor = Array.isArray(receita.pet.tutor)
      ? receita.pet.tutor[0]
      : receita.pet.tutor;
    petInicial = {
      id: receita.pet.id,
      rotulo: receita.pet.nome,
      detalhe: tutor ? `Tutor: ${tutor.nome}` : undefined,
    };
  }

  const salvar = atualizarReceita.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Editar receita"
        subtitulo={`${receita.pet?.nome ?? "Pet"} · ${formatDataISO(receita.data)}`}
      />
      <Card>
        <ReceitaForm
          action={salvar}
          receita={receita}
          medicamentos={medicamentos}
          veterinarios={veterinarios ?? []}
          petInicial={petInicial}
          consultaId={receita.consulta_id ?? undefined}
          cancelarHref={`/receitas/${id}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
