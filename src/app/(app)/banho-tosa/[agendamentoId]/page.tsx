import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock,
  Phone,
  Play,
  Sparkles,
  Square,
  User,
} from "lucide-react";
import { IconeWhatsapp } from "@/components/icone-whatsapp";
import { getSessao } from "@/lib/auth";
import { formatDataHora, formatHora, formatTelefone } from "@/lib/format";
import { soDigitos } from "@/lib/validacao";
import { PORTES, type AgendamentoStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, BadgeAgendamento } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { Campo, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { IconeEspecie } from "@/components/icone-especie";
import { BotaoEtapa } from "../botao-etapa";
import { FichaCard } from "../ficha-card";
import {
  etapaDoStatus,
  SERVICOS_BANHO_TOSA,
  type ExecucaoBanhoTosa,
  type FichaBanhoTosa,
} from "../schema";
import { finalizarExecucao, iniciarExecucao, salvarServicos } from "../actions";
import { FotoExecucao } from "./foto-execucao";
import { TempoDecorrido } from "./tempo-decorrido";

export const metadata = { title: "Banho e tosa" };

interface AgendamentoDetalhe {
  id: string;
  pet_id: string;
  data_hora: string;
  tipo: string;
  status: AgendamentoStatus;
  observacoes: string | null;
  pet: {
    id: string;
    nome: string;
    especie: string;
    raca: string | null;
    porte: string | null;
    foto_url: string | null;
    tutor: { id: string; nome: string; telefone: string } | null;
  } | null;
}

const rotuloPorte = (valor: string | null | undefined) =>
  PORTES.find((p) => p.valor === valor)?.rotulo ?? null;

/** Item da linha de dados do cabeçalho (ícone + rótulo acessível + valor). */
function Info({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: typeof Clock;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icone className="size-4 shrink-0 text-ink-muted" strokeWidth={1.8} aria-hidden />
      <span className="sr-only">{rotulo}</span>
      <span className="min-w-0 truncate text-ink">{children}</span>
    </div>
  );
}

export default async function ExecucaoBanhoTosaPage({
  params,
  searchParams,
}: {
  params: Promise<{ agendamentoId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { agendamentoId } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: agendamento } = await supabase
    .from("agendamento")
    .select(
      "id, pet_id, data_hora, tipo, status, observacoes, " +
        "pet:pet_id (id, nome, especie, raca, porte, foto_url, tutor:tutor_id (id, nome, telefone))"
    )
    .eq("id", agendamentoId)
    .maybeSingle<AgendamentoDetalhe>();

  // Só atendimentos de banho e tosa entram nesta tela.
  if (!agendamento || agendamento.tipo !== "banho_tosa") notFound();

  const [{ data: execucao }, { data: ficha }] = await Promise.all([
    supabase
      .from("execucao_banho_tosa")
      .select(
        "id, agendamento_id, pet_id, servicos, inicio, fim, observacoes, foto_antes, foto_depois"
      )
      .eq("agendamento_id", agendamentoId)
      .maybeSingle<ExecucaoBanhoTosa>(),
    supabase
      .from("ficha_banho_tosa")
      .select(
        "id, pet_id, tipo_tosa, altura_maquina, shampoo, perfume, observacoes, restricoes, temperamento, updated_at"
      )
      .eq("pet_id", agendamento.pet_id)
      .maybeSingle<FichaBanhoTosa>(),
  ]);

  const pet = agendamento.pet;
  const tutor = pet?.tutor ?? null;
  const porte = rotuloPorte(pet?.porte);
  const etapa = etapaDoStatus(agendamento.status);
  const servicosMarcados = new Set(execucao?.servicos ?? []);
  const destino = `/banho-tosa/${agendamentoId}`;

  // Dia do atendimento no fuso da clínica: leva de volta ao painel certo.
  const diaDoPainel = new Date(agendamento.data_hora).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  // Mensagem pronta de retirada. O envio automático chega junto com a
  // integração oficial do WhatsApp (Cloud API). Por enquanto abrimos o
  // aplicativo com o texto preenchido.
  const linkWhatsapp = tutor
    ? `https://wa.me/${soDigitos(tutor.telefone)}?text=${encodeURIComponent(
        `Oi! O(a) ${pet?.nome ?? "seu pet"} já está pronto(a) para retirada.`
      )}`
    : null;

  return (
    <div>
      <PageHeader
        titulo={pet?.nome ?? "Atendimento"}
        subtitulo={`Banho e tosa · ${formatDataHora(agendamento.data_hora)}`}
        acao={
          <>
            <ButtonLink
              href={`/banho-tosa?data=${diaDoPainel}`}
              variante="secondary"
              className="min-h-11"
            >
              <ArrowLeft className="size-4" />
              Painel do dia
            </ButtonLink>
            {etapa?.proximo && etapa.acao && (
              <BotaoEtapa
                agendamentoId={agendamento.id}
                proximo={etapa.proximo}
                rotulo={etapa.acao}
              />
            )}
          </>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------------- Cabeçalho do pet ---------------- */}
        <Card className="lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {pet?.foto_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={pet.foto_url}
                alt={`Foto de ${pet.nome}`}
                className="size-24 shrink-0 self-start rounded-2xl bg-white/20 object-cover sm:size-28"
              />
            ) : (
              <span className="flex size-24 shrink-0 items-center justify-center self-start rounded-2xl bg-white/15 sm:size-28">
                <IconeEspecie especie={pet?.especie} tamanho="lg" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {pet ? (
                  <Link
                    href={`/pets/${pet.id}`}
                    className="truncate text-lg font-semibold link-vidro"
                  >
                    {pet.nome}
                  </Link>
                ) : (
                  <span className="text-lg font-semibold text-ink">Pet removido</span>
                )}
                <BadgeAgendamento status={agendamento.status} />
                {porte && <Badge tom="neutro">Porte {porte.toLowerCase()}</Badge>}
              </div>

              <p className="mt-0.5 truncate text-sm text-ink-muted">
                {pet?.especie ?? "—"}
                {pet?.raca ? ` · ${pet.raca}` : ""}
              </p>

              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                <Info icone={CalendarClock} rotulo="Horário">
                  {formatHora(agendamento.data_hora)}
                </Info>
                <Info icone={User} rotulo="Tutor">
                  {tutor ? (
                    <Link
                      href={`/tutores/${tutor.id}`}
                      className="link-vidro"
                    >
                      {tutor.nome}
                    </Link>
                  ) : (
                    "Sem tutor"
                  )}
                </Info>
                <Info icone={Phone} rotulo="Telefone">
                  {formatTelefone(tutor?.telefone)}
                </Info>
                <Info icone={Bath} rotulo="Etapa">
                  {etapa?.titulo ?? "Fora do fluxo"}
                </Info>
              </div>

              {agendamento.observacoes && (
                <p className="mt-3 whitespace-pre-line rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-ink">
                  {agendamento.observacoes}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ---------------- Ficha de preferências ---------------- */}
        <FichaCard
          petId={agendamento.pet_id}
          petNome={pet?.nome ?? "Este pet"}
          ficha={ficha ?? null}
          destino={destino}
        />

        {/* ---------------- Serviços executados ---------------- */}
        <Card>
          <CardTitulo className="flex items-center gap-2">
            <Sparkles className="size-4 text-ink-muted" aria-hidden />
            Serviços
          </CardTitulo>

          <form action={salvarServicos.bind(null, agendamentoId)} className="space-y-3">
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {SERVICOS_BANHO_TOSA.map((servico) => (
                <li key={servico}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-ink transition-colors hover:bg-white/20">
                    <input
                      type="checkbox"
                      name="servicos"
                      value={servico}
                      defaultChecked={servicosMarcados.has(servico)}
                      className="size-4 shrink-0 accent-white"
                    />
                    <span className="min-w-0 flex-1">{servico}</span>
                  </label>
                </li>
              ))}
            </ul>

            <SubmitButton
              variante="secondary"
              carregando="Salvando…"
              className="min-h-11"
            >
              Salvar serviços
            </SubmitButton>
          </form>
        </Card>

        {/* ---------------- Execução ---------------- */}
        <Card>
          <CardTitulo className="flex items-center gap-2">
            <Clock className="size-4 text-ink-muted" aria-hidden />
            Execução
          </CardTitulo>

          <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Início
              </dt>
              <dd className="mt-0.5 font-medium text-ink tabular-nums">
                {execucao?.inicio ? formatHora(execucao.inicio) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">Fim</dt>
              <dd className="mt-0.5 font-medium text-ink tabular-nums">
                {execucao?.fim ? formatHora(execucao.fim) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Tempo
              </dt>
              <dd className="mt-0.5 font-medium">
                {execucao?.inicio ? (
                  <TempoDecorrido
                    inicio={execucao.inicio}
                    fim={execucao.fim ?? null}
                  />
                ) : (
                  <span className="text-ink">—</span>
                )}
              </dd>
            </div>
          </dl>

          {execucao?.fim && (
            <p className="mb-3 flex items-center gap-1.5 rounded-xl border border-emerald-200/50 bg-emerald-300/20 px-3 py-2 text-sm font-medium text-emerald-50">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              Serviço finalizado
            </p>
          )}

          <form className="space-y-3">
            <Campo rotulo="Observações do serviço" htmlFor="execucao-observacoes">
              <Textarea
                id="execucao-observacoes"
                name="observacoes"
                defaultValue={execucao?.observacoes ?? ""}
                maxLength={1000}
                className="min-h-24"
                placeholder="Como o pet se comportou, nós encontrados, machucados…"
              />
            </Campo>

            <div className="flex flex-wrap gap-2">
              <SubmitButton
                formAction={iniciarExecucao.bind(null, agendamentoId)}
                variante="secondary"
                carregando="Iniciando…"
                disabled={Boolean(execucao?.inicio)}
                className="min-h-11"
              >
                <Play className="size-4" />
                Iniciar
              </SubmitButton>

              <SubmitButton
                formAction={finalizarExecucao.bind(null, agendamentoId)}
                carregando="Salvando…"
                className="min-h-11"
              >
                <Square className="size-4" />
                {execucao?.fim ? "Salvar observações" : "Finalizar"}
              </SubmitButton>
            </div>
          </form>
        </Card>

        {/* ---------------- Antes e depois ---------------- */}
        <Card className="lg:col-span-2">
          <CardTitulo className="flex items-center gap-2">
            <Camera className="size-4 text-ink-muted" aria-hidden />
            Antes e depois
          </CardTitulo>

          <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
            <FotoExecucao
              agendamentoId={agendamentoId}
              clinicaId={usuario.clinica_id}
              campo="antes"
              rotulo="Antes"
              url={execucao?.foto_antes ?? null}
              petNome={pet?.nome ?? "pet"}
            />
            <FotoExecucao
              agendamentoId={agendamentoId}
              clinicaId={usuario.clinica_id}
              campo="depois"
              rotulo="Depois"
              url={execucao?.foto_depois ?? null}
              petNome={pet?.nome ?? "pet"}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {linkWhatsapp ? (
              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-dark shadow-lg shadow-black/10 transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <IconeWhatsapp className="size-4" aria-hidden />
                Enviar no WhatsApp
              </a>
            ) : (
              <p className="text-sm text-ink-muted">
                Cadastre o telefone do tutor para avisar pelo WhatsApp.
              </p>
            )}
            <p className="text-xs text-ink-muted">
              Abre a conversa com o aviso de retirada já escrito. Anexe a foto do
              depois na hora do envio. O envio automático da imagem chega com a
              integração oficial do WhatsApp.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
