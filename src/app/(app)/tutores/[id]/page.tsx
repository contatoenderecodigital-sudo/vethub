import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import {
  emojiEspecie,
  formatTelefone,
  idadeDoPet,
} from "@/lib/format";
import type { Pet, Tutor } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { excluirTutor } from "../actions";

export const metadata = { title: "Tutor" };

export default async function TutorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: tutor } = await supabase
    .from("tutor")
    .select("*")
    .eq("id", id)
    .single<Tutor>();

  if (!tutor) notFound();

  const { data: pets } = await supabase
    .from("pet")
    .select("id, nome, especie, raca, data_nascimento")
    .eq("tutor_id", id)
    .order("nome")
    .limit(100)
    .returns<Pet[]>();

  const excluirComId = excluirTutor.bind(null, id);
  const zap = tutor.telefone.replace(/\D/g, "");

  return (
    <div>
      <PageHeader
        titulo={tutor.nome}
        subtitulo="Tutor"
        acao={
          <>
            <ButtonLink href={`/tutores/${id}/editar`} variante="secondary">
              Editar
            </ButtonLink>
            <form action={excluirComId}>
              <ConfirmButton
                variante="danger"
                mensagem="Excluir este tutor apaga também os pets e o histórico dele. Tem certeza?"
              >
                Excluir
              </ConfirmButton>
            </form>
          </>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitulo>Contato</CardTitulo>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">WhatsApp</dt>
              <dd className="font-medium text-ink">
                <a
                  href={`https://wa.me/55${zap}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  {formatTelefone(tutor.telefone)}
                </a>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">E-mail</dt>
              <dd className="font-medium text-ink">{tutor.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">CPF</dt>
              <dd className="font-medium text-ink">{tutor.cpf ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Endereço</dt>
              <dd className="text-right font-medium text-ink">
                {tutor.endereco ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">LGPD</dt>
              <dd>
                {tutor.consentimento_lgpd ? (
                  <Badge tom="success">Consentimento registrado</Badge>
                ) : (
                  <Badge tom="pending">Sem consentimento</Badge>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitulo className="mb-0">Pets</CardTitulo>
            <ButtonLink
              href={`/pets/novo?tutor=${id}`}
              variante="secondary"
              tamanho="sm"
            >
              + Novo pet
            </ButtonLink>
          </div>

          {!pets || pets.length === 0 ? (
            <EmptyState
              titulo="Nenhum pet cadastrado"
              mensagem="Cadastre o primeiro pet deste tutor."
            />
          ) : (
            <ul className="divide-y divide-edge">
              {pets.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pets/${p.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-brand-mint/10"
                  >
                    <span className="text-xl">{emojiEspecie(p.especie)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{p.nome}</p>
                      <p className="text-xs text-ink-muted">
                        {p.especie}
                        {p.raca ? ` · ${p.raca}` : ""} ·{" "}
                        {idadeDoPet(p.data_nascimento)}
                      </p>
                    </div>
                    <span className="text-ink-muted">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
