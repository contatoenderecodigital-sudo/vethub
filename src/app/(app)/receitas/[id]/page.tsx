import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  Pencil,
  Pill,
  Plus,
  Printer,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataISO } from "@/lib/format";
import {
  rotuloFormaFarmaceutica,
  rotuloVia,
  type ReceitaItem,
  type ReceitaTipo,
} from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { MenuAcoes } from "@/components/ui/menu-acoes";
import { IconeEspecie } from "@/components/icone-especie";
import { BadgeTipoReceita } from "../badge-tipo";
import { excluirReceita } from "../actions";

export const metadata = { title: "Receita" };

interface ReceitaDetalhe {
  id: string;
  pet_id: string;
  consulta_id: string | null;
  tipo: ReceitaTipo;
  data: string;
  orientacoes: string | null;
  retorno_em: string | null;
  pet: {
    id: string;
    nome: string;
    especie: string;
    raca: string | null;
    tutor: { id: string; nome: string } | null;
  } | null;
  veterinario: { id: string; nome: string } | null;
}

export default async function ReceitaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: receita } = await supabase
    .from("receita")
    .select(
      "id, pet_id, consulta_id, tipo, data, orientacoes, retorno_em, pet:pet_id (id, nome, especie, raca, tutor:tutor_id (id, nome)), veterinario:veterinario_id (id, nome)"
    )
    .eq("id", id)
    .single<ReceitaDetalhe>();

  if (!receita) notFound();

  const { data: itens } = await supabase
    .from("receita_item")
    .select("*")
    .eq("receita_id", id)
    .order("ordem")
    .returns<ReceitaItem[]>();

  const pet = receita.pet;
  const podeEditar = usuario.papel !== "recepcao";
  const excluirComIds = excluirReceita.bind(null, id, receita.pet_id);

  return (
    <div>
      <PageHeader
        titulo={`Receita · ${pet?.nome ?? "Pet removido"}`}
        subtitulo={`${formatDataISO(receita.data)}${
          receita.veterinario ? ` · ${receita.veterinario.nome}` : ""
        }`}
        acao={
          podeEditar && (
            // São 4 ações: só "Imprimir" fica visível, o resto vai para o menu.
            <MenuAcoes>
              <ButtonLink href={`/receitas/${id}/editar`} variante="ghost">
                <Pencil className="size-4 shrink-0" />
                Editar
              </ButtonLink>
              <ButtonLink href={`/receitas/nova?pet=${receita.pet_id}`} variante="ghost">
                <Plus className="size-4 shrink-0" />
                Nova receita para este pet
              </ButtonLink>
              <form action={excluirComIds}>
                <ConfirmButton
                  variante="danger"
                  mensagem="Excluir esta receita apaga também os medicamentos dela. Tem certeza?"
                >
                  <Trash2 className="size-4 shrink-0" />
                  Excluir
                </ConfirmButton>
              </form>
            </MenuAcoes>
          )
        }
        acaoPrincipal={
          <ButtonLink href={`/receitas/${id}/imprimir`}>
            <Printer className="size-4 shrink-0" />
            Imprimir
          </ButtonLink>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="self-start lg:col-span-1">
          <CardTitulo>Receita</CardTitulo>
          <div className="flex items-center gap-3">
            <IconeEspecie especie={pet?.especie} tamanho="md" />
            <div className="min-w-0">
              {pet ? (
                <Link
                  href={`/pets/${pet.id}`}
                  className="block truncate text-sm font-semibold link-vidro"
                >
                  {pet.nome}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-ink">Pet removido</p>
              )}
              <p className="truncate text-xs text-ink-muted">
                {pet?.especie}
                {pet?.raca ? ` · ${pet.raca}` : ""}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2.5 border-t border-white/20 pt-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Tipo</dt>
              <dd>
                <BadgeTipoReceita tipo={receita.tipo} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Data</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatDataISO(receita.data)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Tutor</dt>
              <dd className="min-w-0 truncate font-medium">
                {pet?.tutor ? (
                  <Link
                    href={`/tutores/${pet.tutor.id}`}
                    className="link-vidro"
                  >
                    {pet.tutor.nome}
                  </Link>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Veterinário</dt>
              <dd className="min-w-0 truncate font-medium text-ink">
                {receita.veterinario?.nome ?? "-"}
              </dd>
            </div>
            {receita.retorno_em && (
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <CalendarClock className="size-3.5" aria-hidden />
                  Retorno
                </dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatDataISO(receita.retorno_em)}
                </dd>
              </div>
            )}
            {receita.consulta_id && (
              <div className="pt-1">
                <Link
                  href={`/consultas/${receita.consulta_id}`}
                  className="inline-flex items-center gap-1.5 text-sm link-vidro"
                >
                  <Stethoscope className="size-3.5" aria-hidden />
                  Ver consulta de origem
                </Link>
              </div>
            )}
          </dl>

          <p className="mt-3 border-t border-white/20 pt-3 text-xs text-ink-muted">
            O CRMV ainda não é cadastrado no VetHub. A receita impressa deixa a
            linha do carimbo em branco para o preenchimento manual.
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitulo>Medicamentos</CardTitulo>
          <ol className="space-y-3">
            {(itens ?? []).map((item, indice) => {
              const forma = rotuloFormaFarmaceutica(item.forma_farmaceutica);
              const via = rotuloVia(item.via);
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-edge bg-white/5 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink">
                      <span className="text-ink-muted">{indice + 1}. </span>
                      {item.medicamento}
                      {item.concentracao ? ` ${item.concentracao}` : ""}
                      {forma ? ` · ${forma}` : ""}
                    </p>
                    {item.quantidade && (
                      <span className="text-sm text-ink-muted">
                        {item.quantidade}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap pl-4 text-sm text-ink">
                    {item.posologia}
                  </p>
                  {(via || item.observacao) && (
                    <p className="mt-1 pl-4 text-xs text-ink-muted">
                      {via ? `Via ${via.toLowerCase()}` : ""}
                      {via && item.observacao ? " · " : ""}
                      {item.observacao ?? ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {receita.orientacoes && (
            <div className="mt-4 border-t border-white/20 pt-3">
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                <Pill className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                Orientações gerais
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                {receita.orientacoes}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
