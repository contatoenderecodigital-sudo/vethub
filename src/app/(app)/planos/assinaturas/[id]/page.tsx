import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Ban,
  CalendarClock,
  History,
  PauseCircle,
  PlayCircle,
  Undo2,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO, hojeISO } from "@/lib/format";
import type { AssinaturaStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Progresso } from "@/components/ui/estatistica";
import { PageHeader } from "@/components/ui/page-header";
import { alterarStatusAssinatura, excluirUso } from "../../actions";
import { BadgeAssinatura } from "../../badges";
import { limitesDoMes, primeiro, proximaCobranca } from "../../schema";
import { RegistrarUsoForm, type OpcaoBeneficio } from "./registrar-uso-form";

export const metadata = { title: "Assinatura" };

const USOS_NO_HISTORICO = 20;

interface AssinaturaDetalhe {
  id: string;
  valor_mensal: number;
  dia_cobranca: number;
  inicio: string;
  fim: string | null;
  status: AssinaturaStatus;
  observacao: string | null;
  plano_item_id: string;
  tutor: { id: string; nome: string } | { id: string; nome: string }[] | null;
  pet: { id: string; nome: string } | { id: string; nome: string }[] | null;
  plano: { id: string; nome: string } | { id: string; nome: string }[] | null;
}

interface BeneficioLinha {
  id: string;
  descricao: string;
  quantidade_mes: number;
  desconto_percentual: number | null;
}

interface UsoLinha {
  id: string;
  beneficio_id: string | null;
  descricao: string;
  data: string;
}

/** Uma linha "rótulo: valor" da ficha. */
function Dado({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs text-ink-muted">{rotulo}</dt>
      <dd className="text-sm font-medium text-ink">{valor}</dd>
    </div>
  );
}

export default async function AssinaturaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  // Suspender/cancelar é decisão comercial (admin e recepção);
  // registrar uso acontece no atendimento, então vale para todos os perfis.
  const podeGerenciar = usuario.papel !== "veterinario";

  const { data: assinatura } = await supabase
    .from("assinatura")
    .select(
      "id, valor_mensal, dia_cobranca, inicio, fim, status, observacao, plano_item_id, tutor:tutor_id (id, nome), pet:pet_id (id, nome), plano:plano_item_id (id, nome)"
    )
    .eq("id", id)
    .single<AssinaturaDetalhe>();

  if (!assinatura) notFound();

  const hoje = hojeISO();
  const mes = limitesDoMes(hoje);

  const [{ data: beneficios }, { data: usosDoMes }, { data: historico }] =
    await Promise.all([
      supabase
        .from("plano_beneficio")
        .select("id, descricao, quantidade_mes, desconto_percentual")
        .eq("plano_item_id", assinatura.plano_item_id)
        .order("created_at")
        .returns<BeneficioLinha[]>(),
      // Consumo do mês corrente: é o que define quanto ainda sobra da franquia.
      supabase
        .from("uso_beneficio")
        .select("id, beneficio_id, descricao, data")
        .eq("assinatura_id", id)
        .gte("data", mes.inicio)
        .lte("data", mes.fim)
        .returns<UsoLinha[]>(),
      supabase
        .from("uso_beneficio")
        .select("id, beneficio_id, descricao, data")
        .eq("assinatura_id", id)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(USOS_NO_HISTORICO)
        .returns<UsoLinha[]>(),
    ]);

  const listaBeneficios = beneficios ?? [];
  const lista = usosDoMes ?? [];

  // Quantos usos de cada benefício já entraram no mês corrente.
  const usadosPorBeneficio = new Map<string, number>();
  let avulsos = 0;
  for (const u of lista) {
    if (!u.beneficio_id) {
      avulsos += 1;
      continue;
    }
    usadosPorBeneficio.set(
      u.beneficio_id,
      (usadosPorBeneficio.get(u.beneficio_id) ?? 0) + 1
    );
  }

  const tutor = primeiro(assinatura.tutor);
  const pet = primeiro(assinatura.pet);
  const plano = primeiro(assinatura.plano);
  const ativa = assinatura.status === "ativa";
  const cancelada = assinatura.status === "cancelada";
  const proxima = proximaCobranca(assinatura.dia_cobranca, hoje);

  const opcoesUso: OpcaoBeneficio[] = listaBeneficios.map((b) => ({
    id: b.id,
    descricao: b.descricao,
    quantidade_mes: b.quantidade_mes,
    usados: usadosPorBeneficio.get(b.id) ?? 0,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        titulo={tutor?.nome ?? "Assinatura"}
        subtitulo={[plano?.nome, pet?.nome].filter(Boolean).join(" · ")}
        acao={
          podeGerenciar && !cancelada ? (
            <>
              {ativa ? (
                <form action={alterarStatusAssinatura.bind(null, id, "suspensa")}>
                  <ConfirmButton
                    variante="secondary"
                    mensagem="Suspender esta assinatura? Ela para de gerar cobranças até ser reativada."
                  >
                    <PauseCircle className="size-4" />
                    Suspender
                  </ConfirmButton>
                </form>
              ) : (
                <form action={alterarStatusAssinatura.bind(null, id, "ativa")}>
                  <ConfirmButton
                    variante="secondary"
                    mensagem="Reativar esta assinatura? Ela volta a gerar cobranças."
                  >
                    <PlayCircle className="size-4" />
                    Reativar
                  </ConfirmButton>
                </form>
              )}
              <form action={alterarStatusAssinatura.bind(null, id, "cancelada")}>
                <ConfirmButton
                  variante="danger"
                  mensagem="Cancelar esta assinatura? O histórico fica guardado, mas ela não volta a cobrar."
                >
                  <Ban className="size-4" />
                  Cancelar
                </ConfirmButton>
              </form>
            </>
          ) : undefined
        }
      />

      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100" role="alert">
          {erro}
        </p>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CardTitulo className="mb-0">Dados da assinatura</CardTitulo>
          <BadgeAssinatura status={assinatura.status} />
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-muted">Valor mensal</dt>
            <dd className="text-lg font-bold text-ink tabular-nums">
              {formatBRL(assinatura.valor_mensal)}
            </dd>
          </div>
          <Dado rotulo="Dia da cobrança" valor={`Todo dia ${assinatura.dia_cobranca}`} />
          <Dado rotulo="Início" valor={formatDataISO(assinatura.inicio)} />
          <Dado
            rotulo={cancelada ? "Encerrada em" : "Próxima cobrança"}
            valor={cancelada ? formatDataISO(assinatura.fim) : formatDataISO(proxima)}
          />
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-ink-muted">Tutor</dt>
            <dd className="text-sm font-medium">
              {tutor ? (
                <Link
                  href={`/tutores/${tutor.id}`}
                  className="link-vidro"
                >
                  {tutor.nome}
                </Link>
              ) : (
                <span className="text-ink">-</span>
              )}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-ink-muted">Pet</dt>
            <dd className="text-sm font-medium">
              {pet ? (
                <Link
                  href={`/pets/${pet.id}`}
                  className="link-vidro"
                >
                  {pet.nome}
                </Link>
              ) : (
                <span className="text-ink">Plano do tutor (sem pet fixo)</span>
              )}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-ink-muted">Plano</dt>
            <dd className="text-sm font-medium">
              {plano ? (
                <Link
                  href={`/planos/${plano.id}`}
                  className="link-vidro"
                >
                  {plano.nome}
                </Link>
              ) : (
                <span className="text-ink">-</span>
              )}
            </dd>
          </div>
        </dl>

        {assinatura.observacao && (
          <p className="mt-4 whitespace-pre-wrap border-t border-edge pt-3 text-sm text-ink-muted">
            {assinatura.observacao}
          </p>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitulo className="mb-0 flex items-center gap-2">
            <CalendarClock className="size-4" strokeWidth={1.8} aria-hidden />
            Benefícios usados em {formatDataISO(mes.inicio).slice(3)}
          </CardTitulo>
          {ativa && <RegistrarUsoForm assinaturaId={id} beneficios={opcoesUso} />}
        </div>

        {listaBeneficios.length === 0 ? (
          <p className="rounded-xl border border-edge bg-white/10 px-3 py-4 text-sm text-ink-muted">
            O plano desta assinatura não tem benefícios cadastrados.
          </p>
        ) : (
          <ul className="space-y-4">
            {listaBeneficios.map((b) => {
              const usados = usadosPorBeneficio.get(b.id) ?? 0;
              const esgotado = usados >= b.quantidade_mes;
              const desconto = Number(b.desconto_percentual ?? 0);
              return (
                <li key={b.id}>
                  <Progresso
                    rotulo={b.descricao}
                    valor={usados}
                    maximo={b.quantidade_mes}
                  />
                  {(esgotado || desconto > 0) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {esgotado && <Badge tom="pending">Franquia esgotada</Badge>}
                      {desconto > 0 && (
                        <p className="text-xs text-ink-muted">
                          {desconto.toLocaleString("pt-BR", {
                            maximumFractionDigits: 2,
                          })}
                          % de desconto no que passar da franquia.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {avulsos > 0 && (
          <p className="mt-4 border-t border-edge pt-3 text-xs text-ink-muted">
            {avulsos} {avulsos === 1 ? "uso avulso" : "usos avulsos"} no mês (fora
            da franquia dos benefícios).
          </p>
        )}
      </Card>

      <Card>
        <CardTitulo className="flex items-center gap-2">
          <History className="size-4" strokeWidth={1.8} aria-hidden />
          Histórico de usos
        </CardTitulo>

        {!historico || historico.length === 0 ? (
          <p className="rounded-xl border border-edge bg-white/10 px-3 py-4 text-sm text-ink-muted">
            Nenhum uso registrado nesta assinatura ainda.
          </p>
        ) : (
          <ul className="divide-y divide-white/15">
            {historico.map((u) => {
              const beneficio = listaBeneficios.find((b) => b.id === u.beneficio_id);
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                >
                  <span className="w-20 shrink-0 text-xs text-ink-muted tabular-nums">
                    {formatDataISO(u.data)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {u.descricao}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {beneficio ? beneficio.descricao : "Uso avulso"}
                    </p>
                  </div>

                  {/* Marcar o banho errado queimava a franquia do mês e não
                      havia volta, o atendente teria que pedir para o tutor
                      "usar a mais" no mês seguinte, o que não existe. Erro de
                      digitação no balcão é rotina. */}
                  <form
                    action={excluirUso.bind(null, u.id, id)}
                    className="shrink-0"
                  >
                    <ConfirmButton
                      variante="ghost"
                      tamanho="sm"
                      aria-label={`Desfazer uso: ${u.descricao}`}
                      titulo="Desfazer uso"
                      mensagem={`Desfazer "${u.descricao}"? A franquia do mês volta a contar sem ele.`}
                      rotuloConfirmar="Desfazer"
                      className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-0"
                    >
                      <Undo2 className="size-4" />
                    </ConfirmButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        {historico && historico.length >= USOS_NO_HISTORICO && (
          <p className="mt-2 text-xs text-ink-muted">
            Mostrando os {USOS_NO_HISTORICO} usos mais recentes.
          </p>
        )}
      </Card>
    </div>
  );
}
