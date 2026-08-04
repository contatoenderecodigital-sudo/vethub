import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  IdCard,
  Mail,
  MapPin,
  MessageCircle,
  PawPrint,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatEndereco, formatTelefone, idadeDoPet } from "@/lib/format";
import type { Pet, Tutor } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconeEspecie } from "@/components/icone-especie";
import { excluirTutor } from "../actions";
import { CardFinanceiro } from "./financeiro";

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
  // telefone novo já vem com DDI 55; cadastros antigos ganham o prefixo aqui
  const digitos = tutor.telefone.replace(/\D/g, "");
  const zap = digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;

  return (
    <div>
      <PageHeader
        titulo={tutor.nome}
        subtitulo="Tutor"
        acao={
          <>
            <ButtonLink href={`/tutores/${id}/editar`} variante="secondary">
              <Pencil className="size-4" />
              Editar
            </ButtonLink>
            <form action={excluirComId}>
              <ConfirmButton
                variante="danger"
                mensagem="Excluir este tutor apaga também os pets e o histórico dele. Tem certeza?"
              >
                <Trash2 className="size-4" />
                Excluir
              </ConfirmButton>
            </form>
          </>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitulo>Contato</CardTitulo>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-ink-muted">
                <MessageCircle className="size-4" />
                WhatsApp
              </dt>
              <dd className="font-medium">
                <a
                  href={`https://wa.me/${zap}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-mint hover:underline"
                >
                  {formatTelefone(tutor.telefone)}
                </a>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-ink-muted">
                <Mail className="size-4" />
                E-mail
              </dt>
              <dd className="min-w-0 truncate font-medium text-ink">{tutor.email ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-ink-muted">
                <IdCard className="size-4" />
                CPF
              </dt>
              <dd className="font-medium text-ink">{tutor.cpf ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-ink-muted">
                <MapPin className="size-4" />
                Endereço
              </dt>
              <dd className="text-right font-medium text-ink">
                {formatEndereco(tutor)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/20 pt-3">
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
            >
              <Plus className="size-4" />
              Novo pet
            </ButtonLink>
          </div>

          {!pets || pets.length === 0 ? (
            <EmptyState
              icone={<PawPrint className="size-7" strokeWidth={1.8} />}
              titulo="Nenhum pet cadastrado"
              mensagem="Cadastre o primeiro pet deste tutor."
            />
          ) : (
            <ul className="divide-y divide-white/15">
              {pets.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pets/${p.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <IconeEspecie especie={p.especie} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{p.nome}</p>
                      <p className="text-xs text-ink-muted">
                        {p.especie}
                        {p.raca ? ` · ${p.raca}` : ""} ·{" "}
                        {idadeDoPet(p.data_nascimento)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Financeiro ocupa a linha inteira abaixo dos dois cards */}
        <div className="lg:col-span-2">
          <CardFinanceiro tutorId={id} />
        </div>
      </div>
    </div>
  );
}
