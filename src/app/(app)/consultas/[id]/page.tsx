import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ClipboardList,
  ExternalLink,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Pill,
  Plus,
  SearchCheck,
  Stethoscope,
  StickyNote,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataHora, formatTelefone } from "@/lib/format";
import type { Anexo, AnexoTipo } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconeEspecie } from "@/components/icone-especie";
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

const ICONE_TIPO_ANEXO: Record<AnexoTipo, LucideIcon> = {
  foto: ImageIcon,
  pdf: FileText,
  exame: FlaskConical,
};

/** Seção do atendimento: subtítulo pequeno com ícone + texto preservando quebras. */
function Secao({
  titulo,
  icone: Icone,
  texto,
}: {
  titulo: string;
  icone: LucideIcon;
  texto: string | null;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
        <Icone className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
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
                <Pencil className="size-4" />
                Editar
              </ButtonLink>
              <form action={excluirComIds}>
                <ConfirmButton
                  variante="danger"
                  mensagem="Excluir esta consulta apaga também os anexos dela. Tem certeza?"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </ConfirmButton>
              </form>
              <ButtonLink
                href={`/receitas/nova?pet=${consulta.pet_id}&consulta=${id}`}
                variante="secondary"
              >
                <Pill className="size-4" />
                Receituário
              </ButtonLink>
              <ButtonLink
                href={`/orcamentos/novo?pet=${consulta.pet_id}&consulta=${id}`}
                variante="secondary"
              >
                <Plus className="size-4" />
                Orçamento
              </ButtonLink>
            </>
          )
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 self-start">
          <CardTitulo>Paciente</CardTitulo>
          <div className="flex items-center gap-3">
            <IconeEspecie especie={pet.especie} tamanho="md" />
            <div className="min-w-0">
              <Link
                href={`/pets/${pet.id}`}
                className="block truncate text-sm font-semibold text-brand-mint hover:underline"
              >
                {pet.nome}
              </Link>
              <p className="truncate text-xs text-ink-muted">
                {pet.especie}
                {pet.raca ? ` · ${pet.raca}` : ""}
              </p>
            </div>
          </div>
          <dl className="mt-4 space-y-2.5 border-t border-white/20 pt-3 text-sm">
            <div className="flex items-center gap-2">
              <dt className="flex items-center text-ink-muted">
                <User className="size-4" strokeWidth={1.8} aria-hidden />
                <span className="sr-only">Tutor</span>
              </dt>
              <dd className="min-w-0 flex-1 truncate font-medium">
                {pet.tutor ? (
                  <Link
                    href={`/tutores/${pet.tutor.id}`}
                    className="text-brand-mint hover:underline"
                  >
                    {pet.tutor.nome}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="flex items-center text-ink-muted">
                <Phone className="size-4" strokeWidth={1.8} aria-hidden />
                <span className="sr-only">Telefone</span>
              </dt>
              <dd className="min-w-0 flex-1 truncate font-medium text-ink">
                {formatTelefone(pet.tutor?.telefone)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitulo>Atendimento</CardTitulo>
          <div className="space-y-4">
            <Secao titulo="Queixa" icone={MessageSquare} texto={consulta.queixa} />
            <Secao titulo="Anamnese" icone={ClipboardList} texto={consulta.anamnese} />
            <Secao
              titulo="Exame físico"
              icone={Stethoscope}
              texto={consulta.exame_fisico}
            />
            <Secao
              titulo="Diagnóstico"
              icone={SearchCheck}
              texto={consulta.diagnostico}
            />
            <Secao titulo="Conduta" icone={Pill} texto={consulta.conduta} />
            <Secao
              titulo="Observações"
              icone={StickyNote}
              texto={consulta.observacoes}
            />
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardTitulo>Anexos</CardTitulo>

          {anexosComUrl.length === 0 ? (
            // Sem anexos: quem pode editar já vê direto a zona de envio
            !podeEditar && (
              <EmptyState
                icone={<Paperclip className="size-7" strokeWidth={1.8} />}
                titulo="Nenhum anexo"
                mensagem="Fotos e exames desta consulta aparecem aqui."
              />
            )
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
              {anexosComUrl.map((a) => {
                const IconeTipo = ICONE_TIPO_ANEXO[a.tipo];
                return (
                  <li
                    key={a.id}
                    className="glass overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    {a.tipo === "foto" && a.urlAssinada ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.urlAssinada}
                        alt={a.nome_arquivo ?? "Foto do anexo"}
                        className="h-32 w-full bg-white/40 object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-32 items-center justify-center bg-white/40 text-ink-muted"
                        aria-hidden
                      >
                        <IconeTipo className="size-8" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <div className="min-w-0">
                        <p
                          className="truncate text-xs font-medium text-ink"
                          title={a.nome_arquivo ?? undefined}
                        >
                          {a.nome_arquivo ?? "Anexo"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                          <IconeTipo className="size-3" aria-hidden />
                          {ROTULO_TIPO_ANEXO[a.tipo]}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {a.urlAssinada && (
                          <a
                            href={a.urlAssinada}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-mint hover:underline"
                          >
                            Abrir
                            <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        )}
                        {podeEditar && (
                          <form action={excluirAnexo.bind(null, a.id, id, a.url)}>
                            <ConfirmButton
                              variante="ghost"
                              tamanho="sm"
                              mensagem="Excluir este anexo?"
                              className="px-2"
                              aria-label="Excluir anexo"
                            >
                              <Trash2 className="size-4" />
                            </ConfirmButton>
                          </form>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {podeEditar && (
            <AnexoUpload
              consultaId={id}
              clinicaId={usuario.clinica_id}
              compacta={anexosComUrl.length > 0}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
