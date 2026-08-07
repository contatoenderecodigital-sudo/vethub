import Link from "next/link";
import {
  Bath,
  ClipboardList,
  Phone,
  Plus,
  TriangleAlert,
  User,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatHora, formatTelefone, hojeISO } from "@/lib/format";
import { dataParamOuHoje } from "@/lib/validacao";
import { PORTES, type AgendamentoStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { NavegadorData } from "@/components/ui/navegador-data";
import { EmptyState } from "@/components/ui/empty-state";
import { IconeEspecie } from "@/components/icone-especie";
import { CartaoArrastavel, Zona } from "@/components/quadro";
import { BotaoEtapa } from "./botao-etapa";
import { QuadroFluxo } from "./quadro-fluxo";
import { ETAPAS_BANHO_TOSA, temperamentoInfo } from "./schema";

export const metadata = { title: "Banho e tosa" };

/** Agendamento de banho e tosa do dia com os joins usados no painel. */
interface AgendamentoFluxo {
  id: string;
  pet_id: string;
  data_hora: string;
  status: AgendamentoStatus;
  observacoes: string | null;
  pet: {
    id: string;
    nome: string;
    especie: string;
    porte: string | null;
    foto_url: string | null;
    tutor: { nome: string; telefone: string } | null;
  } | null;
}

interface FichaResumo {
  pet_id: string;
  restricoes: string | null;
  temperamento: string | null;
}

interface ExecucaoResumo {
  agendamento_id: string;
  servicos: string[] | null;
}

/**
 * Soma dias a uma data YYYY-MM-DD. Constrói o Date com T12:00:00 (meio-dia
 * local) para que o fuso do servidor nunca faça a data "virar".
 */
function deslocarDia(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}

const rotuloPorte = (valor: string | null | undefined) =>
  PORTES.find((p) => p.valor === valor)?.rotulo ?? null;

export default async function BanhoTosaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; erro?: string }>;
}) {
  const { data: dataParam, erro } = await searchParams;
  // Param de data inválido na URL → cai para hoje (nunca quebra a página).
  const data = dataParamOuHoje(dataParam?.trim());
  const { supabase } = await getSessao();

  const dataExtenso = new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Janela do dia em America/Sao_Paulo: offset fixo -03:00 (sem horário de
  // verão), igual ao resto do projeto.
  const { data: agendamentos } = await supabase
    .from("agendamento")
    .select(
      "id, pet_id, data_hora, status, observacoes, " +
        "pet:pet_id (id, nome, especie, porte, foto_url, tutor:tutor_id (nome, telefone))"
    )
    .eq("tipo", "banho_tosa")
    .gte("data_hora", `${data}T00:00:00-03:00`)
    .lt("data_hora", `${deslocarDia(data, 1)}T00:00:00-03:00`)
    .order("data_hora")
    .returns<AgendamentoFluxo[]>();

  // Cancelados saem do fluxo. O painel mostra só quem está no petshop.
  const lista = (agendamentos ?? []).filter((a) => a.status !== "cancelado");

  // Avisos da ficha e serviços já marcados, em duas consultas simples.
  const petIds = [...new Set(lista.map((a) => a.pet_id))];
  const agendamentoIds = lista.map((a) => a.id);

  const [{ data: fichas }, { data: execucoes }] = await Promise.all([
    petIds.length > 0
      ? supabase
          .from("ficha_banho_tosa")
          .select("pet_id, restricoes, temperamento")
          .in("pet_id", petIds)
          .returns<FichaResumo[]>()
      : Promise.resolve({ data: [] as FichaResumo[] }),
    agendamentoIds.length > 0
      ? supabase
          .from("execucao_banho_tosa")
          .select("agendamento_id, servicos")
          .in("agendamento_id", agendamentoIds)
          .returns<ExecucaoResumo[]>()
      : Promise.resolve({ data: [] as ExecucaoResumo[] }),
  ]);

  const fichaPorPet = new Map((fichas ?? []).map((f) => [f.pet_id, f]));
  const servicosPorAgendamento = new Map(
    (execucoes ?? []).map((e) => [e.agendamento_id, e.servicos ?? []])
  );


  return (
    <div>
      <PageHeader
        titulo="Banho e tosa"
        subtitulo={dataExtenso}
        acao={
          <>
            <ButtonLink href="/banho-tosa/fichas" variante="secondary">
              <ClipboardList className="size-4" />
              Fichas de tosa
            </ButtonLink>
            <ButtonLink href={`/agenda/novo?data=${data}`}>
              <Plus className="size-4" />
              Novo agendamento
            </ButtonLink>
          </>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <NavegadorData
          data={data}
          hoje={hojeISO()}
          rota="/banho-tosa"
          rotulo="Escolher a data"
        />
        <span className="ml-auto text-sm text-ink-muted tabular-nums">
          {lista.length} {lista.length === 1 ? "pet no dia" : "pets no dia"}
        </span>
      </div>

      {lista.length > 0 && (
        <p className="mb-3 text-xs text-ink-muted">
          Arraste o pet entre as etapas para mudar a situação, ou use o botão
          do cartão. No celular, puxe pela alça ⠿ no topo.
        </p>
      )}

      {lista.length === 0 ? (
        <EmptyState
          icone={<Bath className="size-7" strokeWidth={1.8} />}
          titulo="Nenhum banho e tosa hoje"
          mensagem="Agende um atendimento do tipo Banho e tosa para ele aparecer neste fluxo."
          acao={
            <ButtonLink href={`/agenda/novo?data=${data}`}>
              <Plus className="size-4" />
              Novo agendamento
            </ButtonLink>
          }
        />
      ) : (
        <QuadroFluxo>
          {ETAPAS_BANHO_TOSA.map((etapa) => {
            const daEtapa = lista.filter((a) => a.status === etapa.status);
            return (
              <Zona
                key={etapa.status}
                id={etapa.status}
                rotulo={etapa.titulo}
                className={`glass rounded-2xl border-t-4 p-3 ${etapa.corBorda}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${etapa.corPonto}`}
                    aria-hidden
                  />
                  <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {etapa.titulo}
                  </h2>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
                    {daEtapa.length}
                  </span>
                </div>

                {daEtapa.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/25 px-3 py-4 text-center text-xs text-ink-muted">
                    Ninguém aqui
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {daEtapa.map((a) => {
                      const pet = a.pet;
                      const ficha = fichaPorPet.get(a.pet_id);
                      const temperamento = temperamentoInfo(ficha?.temperamento);
                      const servicos = servicosPorAgendamento.get(a.id) ?? [];
                      const porte = rotuloPorte(pet?.porte);

                      return (
                        <li key={a.id}>
                          <CartaoArrastavel
                            id={a.id}
                            rotulo={`${pet?.nome ?? "pet"} das ${formatHora(a.data_hora)}`}
                            className="rounded-xl border border-white/25 bg-white/10 p-3"
                          >
                          <Link
                            href={`/banho-tosa/${a.id}`}
                            className="-m-1 block rounded-lg p-1 transition-colors hover:bg-white/10"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-white tabular-nums">
                                {formatHora(a.data_hora)}
                              </span>
                              {porte && <Badge tom="neutro">{porte}</Badge>}
                            </div>

                            <div className="mt-2 flex items-center gap-2.5">
                              {pet?.foto_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={pet.foto_url}
                                  alt={pet.nome}
                                  className="size-10 shrink-0 rounded-full bg-white/20 object-cover"
                                />
                              ) : (
                                <IconeEspecie especie={pet?.especie} />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-ink">
                                  {pet?.nome ?? "Pet"}
                                </p>
                                <p className="flex min-w-0 items-center gap-1 text-xs text-ink-muted">
                                  <User
                                    className="size-3.5 shrink-0"
                                    strokeWidth={1.8}
                                    aria-hidden
                                  />
                                  {/* Em coluna estreita "Maria Aparecida da
                                      Silva" virava "Maria Aparecid…", e o
                                      atendente não sabe de quem é o pet.
                                      Quebrar em duas linhas cabe: o cartão
                                      tem altura de sobra, largura é que não. */}
                                  <span className="min-w-0 [overflow-wrap:anywhere]">
                                    {pet?.tutor?.nome ?? "Sem tutor"}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {pet?.tutor?.telefone && (
                              <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
                                <Phone
                                  className="size-3.5 shrink-0"
                                  strokeWidth={1.8}
                                  aria-hidden
                                />
                                {formatTelefone(pet.tutor.telefone)}
                              </p>
                            )}

                            {servicos.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {servicos.map((s) => (
                                  <Badge key={s} tom="brand">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {a.observacoes && (
                              <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-ink-muted">
                                {a.observacoes}
                              </p>
                            )}

                            {(temperamento?.alerta || ficha?.restricoes) && (
                              <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200/60 bg-amber-300/25 px-2 py-1.5 text-xs font-medium text-amber-50">
                                <TriangleAlert
                                  className="mt-px size-3.5 shrink-0"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                <span className="min-w-0">
                                  {[temperamento?.alerta ? temperamento.rotulo : null, ficha?.restricoes]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </div>
                            )}
                          </Link>

                          {etapa.proximo && etapa.acao && (
                            <BotaoEtapa
                              agendamentoId={a.id}
                              proximo={etapa.proximo}
                              rotulo={etapa.acao}
                              variante={
                                etapa.status === "pronto" ? "primary" : "secondary"
                              }
                              className="mt-3"
                            />
                          )}
                          </CartaoArrastavel>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Zona>
            );
          })}
        </QuadroFluxo>
      )}
    </div>
  );
}
