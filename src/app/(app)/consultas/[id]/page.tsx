import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { emojiEspecie, formatDataHora, formatTelefone } from "@/lib/format";
import type { Anexo, AnexoTipo } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { AnexoUpload } from "../anexo-upload";
import { excluirAnexo, excluirConsulta } from "../actions";

export const metadata = { title: "Consulta" };

interface ConsultaDetalhe {
  id: string;
  clinica_id: string;
  pet_id: string;
  veterinario_id: string | null;
  agendamento_id: string | null;
  data: string;
  queixa: string | null;
  anamnese: string | null;
  exame_fisico: string | null;
  diagnostico: string | null;
  conduta: string | null;
  observacoes: string | null;
  pet: {
    id: string;
    nome: string;
    especie: string;
    raca: string | null;
    tutor: { id: string; nome: string; telefone: string } | null;
  } | null;
  veterinario: { id: string; nome: string } | null;
}

const ROTULO_TIPO_ANEXO: Record<AnexoTipo, string> = {
  foto: "Foto",
  pdf: "PDF",
  exame: "Exame",
};

/** Seção do atendimento: subtítulo pequeno + texto preservando quebras. */
function Secao({ titulo, texto }: { titulo: string; texto: string | null }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {titulo}
      </h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
        {texto?.trim() ? texto : "—"}
      </p>
    </div>
  );
}

export default async function ConsultaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: consulta } = await supabase
    .from("consulta")
    .select(
      "*, pet:pet_id (id, nome, especie, raca, tutor:tutor_id (id, nome, telefone)), veterinario:veterinario_id (id, nome)"
    )
    .eq("id", id)
    .single<ConsultaDetalhe>();

  if (!consulta || !consulta.pet) notFound();
  const pet = consulta.pet;

  const { data: anexos } = await supabase
    .from("anexo")
    .select("*")
    .eq("consulta_id", id)
    .order("created_at")
    .returns<Anexo[]>();

  // URLs assinadas geradas no servidor (bucket privado).
  const anexosComUrl = await Promise.all(
    (anexos ?? []).map(async (a) => {
      const { data } = await supabase.storage
        .from("anexos")
        .createSignedUrl(a.url, 3600);
      return { ...a, urlAssinada: data?.signedUrl ?? null };
    })
  );

  const podeEditar = usuario.papel !== "recepcao";
  const excluirComIds = excluirConsulta.bind(null, id, consulta.pet_id);

  return (
    <div>
      <PageHeader
        titulo={`Consulta — ${pet.nome}`}
        subtitulo={`${formatDataHora(consulta.data)}${
          consulta.veterinario ? ` · ${consulta.veterinario.nome}` : ""
        }`}
        acao={
          podeEditar && (
            <>
              <ButtonLink href={`/consultas/${id}/editar`} variante="secondary">
                Editar
              </ButtonLink>
              <form action={excluirComIds}>
                <ConfirmButton
                  variante="danger"
                  mensagem="Excluir esta consulta apaga também os anexos dela. Tem certeza?"
                >
                  Excluir
                </ConfirmButton>
              </form>
              <ButtonLink
                href={`/orcamentos/novo?pet=${consulta.pet_id}&consulta=${id}`}
                variante="secondary"
              >
                + Orçamento
              </ButtonLink>
            </>
          )
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 self-start">
          <CardTitulo>Paciente</CardTitulo>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Pet</dt>
              <dd className="font-medium">
                <Link
                  href={`/pets/${pet.id}`}
                  className="text-brand hover:underline"
                >
                  {emojiEspecie(pet.especie)} {pet.nome}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Espécie / raça</dt>
              <dd className="text-right font-medium text-ink">
                {pet.especie}
                {pet.raca ? ` · ${pet.raca}` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Tutor</dt>
              <dd className="text-right font-medium">
                {pet.tutor ? (
                  <Link
                    href={`/tutores/${pet.tutor.id}`}
                    className="text-brand hover:underline"
                  >
                    {pet.tutor.nome}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Telefone</dt>
              <dd className="font-medium text-ink">
                {formatTelefone(pet.tutor?.telefone)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitulo>Atendimento</CardTitulo>
          <div className="space-y-4">
            <Secao titulo="Queixa" texto={consulta.queixa} />
            <Secao titulo="Anamnese" texto={consulta.anamnese} />
            <Secao titulo="Exame físico" texto={consulta.exame_fisico} />
            <Secao titulo="Diagnóstico" texto={consulta.diagnostico} />
            <Secao titulo="Conduta" texto={consulta.conduta} />
            <Secao titulo="Observações" texto={consulta.observacoes} />
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardTitulo>Anexos</CardTitulo>

          {anexosComUrl.length === 0 ? (
            <EmptyState
              titulo="Nenhum anexo"
              mensagem="Envie fotos, PDFs ou exames desta consulta."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {anexosComUrl.map((a) => (
                <li
                  key={a.id}
                  className="overflow-hidden rounded-lg border border-edge"
                >
                  {a.tipo === "foto" && a.urlAssinada ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.urlAssinada}
                      alt={a.nome_arquivo ?? "Foto do anexo"}
                      className="h-32 w-full bg-zinc-100 object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-32 items-center justify-center bg-zinc-50 text-4xl"
                      role="img"
                      aria-label="Documento"
                    >
                      📄
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 p-2">
                    <div className="min-w-0">
                      <p
                        className="truncate text-xs font-medium text-ink"
                        title={a.nome_arquivo ?? undefined}
                      >
                        {a.nome_arquivo ?? "Anexo"}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {ROTULO_TIPO_ANEXO[a.tipo]}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {a.urlAssinada && (
                        <a
                          href={a.urlAssinada}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          Abrir
                        </a>
                      )}
                      {podeEditar && (
                        <form action={excluirAnexo.bind(null, a.id, id, a.url)}>
                          <ConfirmButton
                            variante="ghost"
                            tamanho="sm"
                            mensagem="Excluir este anexo?"
                          >
                            Excluir
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {podeEditar && (
            <AnexoUpload consultaId={id} clinicaId={usuario.clinica_id} />
          )}
        </Card>
      </div>
    </div>
  );
}
