import {
  Ban,
  Bath,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  LogIn,
  LogOut,
  RotateCcw,
  Scissors,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import {
  ROTULO_STATUS_AGENDAMENTO,
  ROTULO_TIPO,
  formatDataHora,
} from "@/lib/format";
import {
  STATUS_AGENDAMENTO_ORDEM,
  TIPOS_AGENDAMENTO,
  type AgendamentoStatus,
  type AgendamentoTipo,
} from "@/lib/types";
import { Card, CardTitulo } from "@/components/ui/card";
import {
  Estatistica,
  GradeEstatisticas,
  type EstatisticaProps,
} from "@/components/ui/estatistica";
import { GraficoBarras, GraficoRosca } from "@/components/ui/grafico";
import { Campo, Select } from "@/components/ui/form";
import { abrirRelatorio, type OpcaoSimples } from "../dados";
import {
  LIMITE_LINHAS,
  agrupamentoDoPeriodo,
  descricaoPeriodo,
  fimDoDia,
  idDaUrl,
  inicioDoDia,
  opcaoDaUrl,
  resolverPeriodo,
  serieDoPeriodo,
} from "../definicoes";
import { FiltrosRelatorio } from "../filtros-relatorio";
import { FolhaRelatorio } from "../impressao";
import { AvisoLimite } from "../resumo";
import { TabelaRelatorio, type ColunaRelatorio } from "../tabela-relatorio";

export const metadata = { title: "Relatório de atendimentos" };

const BASE = "/relatorios/atendimentos";

const TIPOS = TIPOS_AGENDAMENTO.map((t) => t.valor);
const STATUS = STATUS_AGENDAMENTO_ORDEM;

const ICONE_STATUS: Record<AgendamentoStatus, LucideIcon> = {
  agendado: CalendarDays,
  check_in: LogIn,
  atendido: Stethoscope,
  pronto: CircleCheck,
  check_out: LogOut,
  cancelado: Ban,
};

const ICONE_TIPO: Record<AgendamentoTipo, LucideIcon> = {
  consulta: Stethoscope,
  retorno: RotateCcw,
  banho_tosa: Bath,
  cirurgia: Scissors,
};

interface AgendamentoLinha {
  id: string;
  data_hora: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  pet: { nome: string; tutor: { nome: string } | null } | null;
  veterinario: { nome: string } | null;
}

interface ConsultaLinha {
  id: string;
  data: string;
  pet: { nome: string; tutor: { nome: string } | null } | null;
  veterinario: { nome: string } | null;
}

/** Linha única do relatório: agenda e consulta avulsa no mesmo formato. */
interface Atendimento {
  id: string;
  quando: string;
  pet: string;
  tutor: string;
  tipo: AgendamentoTipo;
  veterinario: string;
  status: AgendamentoStatus;
  origem: string;
}

export default async function RelatorioAtendimentosPage({
  searchParams,
}: {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    vet?: string;
    tipo?: string;
    status?: string;
  }>;
}) {
  const filtros = await searchParams;
  const periodo = resolverPeriodo(filtros.de, filtros.ate);
  const vet = idDaUrl(filtros.vet);
  const tipo = opcaoDaUrl(filtros.tipo, TIPOS);
  const status = opcaoDaUrl(filtros.status, STATUS);

  const { supabase, clinica } = await abrirRelatorio();

  const inicio = inicioDoDia(periodo.de);
  const fim = fimDoDia(periodo.ate);

  // A consulta avulsa (sem agendamento) sempre entra como tipo "consulta"
  // já atendida, só faz sentido buscá-la se os filtros aceitarem isso.
  const incluiAvulsas =
    (!tipo || tipo === "consulta") && (!status || status === "atendido");

  const consultaAgendamentos = (() => {
    let q = supabase
      .from("agendamento")
      .select(
        "id, data_hora, tipo, status, pet:pet_id (nome, tutor:tutor_id (nome)), veterinario:veterinario_id (nome)"
      )
      .gte("data_hora", inicio)
      .lte("data_hora", fim)
      .order("data_hora")
      .limit(LIMITE_LINHAS);
    if (vet) q = q.eq("veterinario_id", vet);
    if (tipo) q = q.eq("tipo", tipo);
    if (status) q = q.eq("status", status);
    return q.returns<AgendamentoLinha[]>();
  })();

  const consultaAvulsas = (() => {
    if (!incluiAvulsas) return Promise.resolve({ data: [] as ConsultaLinha[] });
    let q = supabase
      .from("consulta")
      .select("id, data, pet:pet_id (nome, tutor:tutor_id (nome)), veterinario:veterinario_id (nome)")
      .is("agendamento_id", null)
      .gte("data", inicio)
      .lte("data", fim)
      .order("data")
      .limit(LIMITE_LINHAS);
    if (vet) q = q.eq("veterinario_id", vet);
    return q.returns<ConsultaLinha[]>();
  })();

  const [{ data: agendamentos }, { data: avulsas }, { data: equipe }] =
    await Promise.all([
      consultaAgendamentos,
      consultaAvulsas,
      supabase
        .from("usuario")
        .select("id, nome")
        .in("papel", ["admin", "veterinario"])
        .order("nome")
        .returns<OpcaoSimples[]>(),
    ]);

  const linhas: Atendimento[] = [
    ...(agendamentos ?? []).map((a) => ({
      id: `ag-${a.id}`,
      quando: a.data_hora,
      pet: a.pet?.nome ?? "—",
      tutor: a.pet?.tutor?.nome ?? "—",
      tipo: a.tipo,
      veterinario: a.veterinario?.nome ?? "Sem veterinário",
      status: a.status,
      origem: "Agenda",
    })),
    ...(avulsas ?? []).map((c) => ({
      id: `co-${c.id}`,
      quando: c.data,
      pet: c.pet?.nome ?? "—",
      tutor: c.pet?.tutor?.nome ?? "—",
      tipo: "consulta" as AgendamentoTipo,
      veterinario: c.veterinario?.nome ?? "Sem veterinário",
      status: "atendido" as AgendamentoStatus,
      origem: "Consulta avulsa",
    })),
  ].sort((a, b) => a.quando.localeCompare(b.quando));

  const porStatus = new Map<AgendamentoStatus, number>();
  const porTipo = new Map<AgendamentoTipo, number>();
  for (const linha of linhas) {
    porStatus.set(linha.status, (porStatus.get(linha.status) ?? 0) + 1);
    porTipo.set(linha.tipo, (porTipo.get(linha.tipo) ?? 0) + 1);
  }

  const cardsStatus: EstatisticaProps[] = [
    {
      rotulo: "Total de atendimentos",
      valor: linhas.length,
      icone: ClipboardList,
    },
    ...STATUS.filter((s) => porStatus.has(s)).map((s) => ({
      rotulo: ROTULO_STATUS_AGENDAMENTO[s],
      valor: porStatus.get(s) ?? 0,
      icone: ICONE_STATUS[s],
      tom: s === "cancelado" ? ("atencao" as const) : undefined,
    })),
  ];

  const cardsTipo: EstatisticaProps[] = TIPOS.filter((t) => porTipo.has(t)).map(
    (t) => ({
      rotulo: ROTULO_TIPO[t],
      valor: porTipo.get(t) ?? 0,
      icone: ICONE_TIPO[t],
    })
  );

  // Barras por dia até 62 dias de período; acima disso o agrupamento vira
  // mensal (ver `agrupamentoDoPeriodo`): barras diárias de um trimestre
  // inteiro não cabem na largura de um celular.
  const agrupamento = agrupamentoDoPeriodo(periodo);
  const serieAtendimentos = serieDoPeriodo(
    periodo,
    linhas.map((l) => ({ quando: l.quando, valor: 1 }))
  );
  const temAtendimentos = serieAtendimentos.some((p) => p.valor > 0);

  // Rosca por tipo de atendimento.
  const fatiasTipo = TIPOS.filter((t) => porTipo.has(t)).map((t) => ({
    tipo: ROTULO_TIPO[t],
    quantidade: porTipo.get(t) ?? 0,
  }));

  const colunas: ColunaRelatorio<Atendimento>[] = [
    {
      rotulo: "Data e hora",
      className: "whitespace-nowrap",
      celula: (l) => formatDataHora(l.quando),
    },
    { rotulo: "Pet", celula: (l) => l.pet },
    { rotulo: "Tutor", celula: (l) => l.tutor },
    { rotulo: "Tipo", celula: (l) => ROTULO_TIPO[l.tipo] },
    { rotulo: "Veterinário", celula: (l) => l.veterinario },
    { rotulo: "Status", celula: (l) => ROTULO_STATUS_AGENDAMENTO[l.status] },
    { rotulo: "Origem", celula: (l) => l.origem },
  ];

  const params = {
    de: periodo.de,
    ate: periodo.ate,
    vet,
    tipo,
    status,
  };

  return (
    <FolhaRelatorio
      titulo="Relatório de atendimentos"
      subtitulo={descricaoPeriodo(periodo)}
      clinica={clinica}
      periodo={descricaoPeriodo(periodo)}
    >
      <FiltrosRelatorio base={BASE} periodo={periodo} params={params}>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Veterinário" htmlFor="vet">
            <Select id="vet" name="vet" defaultValue={vet ?? ""}>
              <option value="">Todos</option>
              {(equipe ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Tipo" htmlFor="tipo">
            <Select id="tipo" name="tipo" defaultValue={tipo ?? ""}>
              <option value="">Todos</option>
              {TIPOS_AGENDAMENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">Todos</option>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_AGENDAMENTO[s]}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
      </FiltrosRelatorio>

      <AvisoLimite quantidade={agendamentos?.length ?? 0} />

      <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
        Por status
      </p>
      <GradeEstatisticas colunas={4} className="mb-4">
        {cardsStatus.map((c) => (
          <Estatistica key={c.rotulo} {...c} />
        ))}
      </GradeEstatisticas>

      {cardsTipo.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Por tipo
          </p>
          <GradeEstatisticas colunas={4} className="mb-4">
            {cardsTipo.map((c) => (
              <Estatistica key={c.rotulo} {...c} />
            ))}
          </GradeEstatisticas>
        </>
      )}

      {/* Gráficos só na tela: o ResponsiveContainer mede a largura do
          navegador e no papel sairia cortado. O papel fica com os cartões
          e a tabela, que trazem os mesmos números. */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2 print:hidden">
        <Card>
          <CardTitulo>
            Atendimentos por {agrupamento === "mes" ? "mês" : "dia"}
          </CardTitulo>
          {temAtendimentos ? (
            <GraficoBarras
              dados={serieAtendimentos}
              eixoX="rotulo"
              altura={240}
              series={[{ chave: "valor", rotulo: "Atendimentos" }]}
            />
          ) : (
            <p className="text-xs text-ink-muted">Sem dados no período.</p>
          )}
        </Card>

        <Card>
          <CardTitulo>Por tipo de atendimento</CardTitulo>
          {fatiasTipo.length > 0 ? (
            <GraficoRosca
              dados={fatiasTipo}
              chaveRotulo="tipo"
              chaveValor="quantidade"
              altura={240}
            />
          ) : (
            <p className="text-xs text-ink-muted">Sem dados no período.</p>
          )}
        </Card>
      </div>

      <TabelaRelatorio
        colunas={colunas}
        linhas={linhas}
        chave={(l) => l.id}
        legenda="Atendimentos do período"
        vazio="Nenhum atendimento no período com esses filtros."
        total={["Total", null, null, null, null, null, `${linhas.length} atendimentos`]}
      />
    </FolhaRelatorio>
  );
}
