import { Cake, PawPrint, UserPlus, Wallet } from "lucide-react";
import {
  formatBRL,
  formatData,
  formatDataISO,
  hojeISO,
  idadeDoPet,
} from "@/lib/format";
import { saldoDaConta } from "@/lib/types";
import { Campo, Input } from "@/components/ui/form";
import { abrirRelatorio } from "../dados";
import { TelefoneTutor } from "../contato";
import {
  LIMITE_LINHAS,
  centavos,
  descricaoPeriodo,
  deslocarDia,
  fimDoDia,
  inicioDoDia,
  inteiroDaUrl,
  resolverPeriodo,
} from "../definicoes";
import { FiltrosRelatorio } from "../filtros-relatorio";
import { FolhaRelatorio } from "../impressao";
import { CartoesResumo, TituloBloco, type ItemResumo } from "../resumo";
import { TabelaRelatorio, type ColunaRelatorio } from "../tabela-relatorio";

export const metadata = { title: "Relatório de tutores e pets" };

const BASE = "/relatorios/clientes";

/** Teto das consultas que só leem ids (marcar quem teve atendimento). */
const LIMITE_IDS = 5000;

const DIAS_PADRAO = 180;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

interface TutorNovo {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
}

interface PetLinha {
  id: string;
  nome: string;
  especie: string;
  data_nascimento: string | null;
  created_at: string;
  tutor: { id: string; nome: string; telefone: string } | null;
}

interface ContaAberta {
  id: string;
  valor: number;
  valor_pago: number;
  vencimento: string;
  tutor: { id: string; nome: string; telefone: string } | null;
}

interface Devedor {
  id: string;
  nome: string;
  telefone: string;
  contas: number;
  aberto: number;
  vencidoDesde: string | null;
}

export default async function RelatorioClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; dias?: string }>;
}) {
  const filtros = await searchParams;
  const periodo = resolverPeriodo(filtros.de, filtros.ate);
  const dias = inteiroDaUrl(filtros.dias, DIAS_PADRAO, 30, 1095);

  const { supabase, clinica } = await abrirRelatorio();

  const hoje = hojeISO();
  const corte = deslocarDia(hoje, -dias);
  const mesAniversario = periodo.ate.slice(5, 7);

  const [
    { data: tutoresNovos },
    { data: petsNovos },
    { data: pets },
    { data: contas },
    { data: consultasRecentes },
    { data: agendamentosRecentes },
  ] = await Promise.all([
    supabase
      .from("tutor")
      .select("id, nome, telefone, created_at")
      .gte("created_at", inicioDoDia(periodo.de))
      .lte("created_at", fimDoDia(periodo.ate))
      .order("created_at")
      .limit(LIMITE_LINHAS)
      .returns<TutorNovo[]>(),
    supabase
      .from("pet")
      .select("id, nome, especie, data_nascimento, created_at, tutor:tutor_id (id, nome, telefone)")
      .gte("created_at", inicioDoDia(periodo.de))
      .lte("created_at", fimDoDia(periodo.ate))
      .order("created_at")
      .limit(LIMITE_LINHAS)
      .returns<PetLinha[]>(),
    // Base viva da clínica: serve para aniversariantes e para a reativação.
    supabase
      .from("pet")
      .select("id, nome, especie, data_nascimento, created_at, tutor:tutor_id (id, nome, telefone)")
      .eq("falecido", false)
      .order("nome")
      .limit(LIMITE_LINHAS)
      .returns<PetLinha[]>(),
    supabase
      .from("conta")
      .select("id, valor, valor_pago, vencimento, tutor:tutor_id (id, nome, telefone)")
      .eq("tipo", "receber")
      .in("status", ["aberta", "parcial"])
      .not("tutor_id", "is", null)
      .order("vencimento")
      .limit(LIMITE_LINHAS)
      .returns<ContaAberta[]>(),
    supabase
      .from("consulta")
      .select("pet_id")
      .gte("data", inicioDoDia(corte))
      .limit(LIMITE_IDS)
      .returns<{ pet_id: string }[]>(),
    supabase
      .from("agendamento")
      .select("pet_id")
      .neq("status", "cancelado")
      .gte("data_hora", inicioDoDia(corte))
      .limit(LIMITE_IDS)
      .returns<{ pet_id: string }[]>(),
  ]);

  // ---------------------------------------------------------------
  // 1. Novos cadastros no período
  // ---------------------------------------------------------------
  interface Novo {
    chave: string;
    o_que: string;
    nome: string;
    tutor: string;
    telefone: string | null;
    quando: string;
  }

  const novos: Novo[] = [
    ...(tutoresNovos ?? []).map((t) => ({
      chave: `t-${t.id}`,
      o_que: "Tutor",
      nome: t.nome,
      tutor: t.nome,
      telefone: t.telefone,
      quando: t.created_at,
    })),
    ...(petsNovos ?? []).map((p) => ({
      chave: `p-${p.id}`,
      o_que: "Pet",
      nome: `${p.nome} (${p.especie})`,
      tutor: p.tutor?.nome ?? "—",
      telefone: p.tutor?.telefone ?? null,
      quando: p.created_at,
    })),
  ].sort((a, b) => a.quando.localeCompare(b.quando));

  // ---------------------------------------------------------------
  // 2. Aniversariantes do mês
  // ---------------------------------------------------------------
  const aniversariantes = (pets ?? [])
    .filter((p) => p.data_nascimento?.slice(5, 7) === mesAniversario)
    .sort((a, b) =>
      (a.data_nascimento ?? "").slice(8, 10).localeCompare(
        (b.data_nascimento ?? "").slice(8, 10)
      )
    );

  // ---------------------------------------------------------------
  // 3. Tutores com saldo devedor
  // ---------------------------------------------------------------
  const mapaDevedores = new Map<string, Devedor>();
  for (const conta of contas ?? []) {
    const tutor = conta.tutor;
    if (!tutor) continue;
    const saldo = saldoDaConta(conta);
    if (saldo <= 0) continue;
    const atual = mapaDevedores.get(tutor.id) ?? {
      id: tutor.id,
      nome: tutor.nome,
      telefone: tutor.telefone,
      contas: 0,
      aberto: 0,
      vencidoDesde: null,
    };
    atual.contas += 1;
    atual.aberto = centavos(atual.aberto + saldo);
    if (
      conta.vencimento < hoje &&
      (atual.vencidoDesde === null || conta.vencimento < atual.vencidoDesde)
    ) {
      atual.vencidoDesde = conta.vencimento;
    }
    mapaDevedores.set(tutor.id, atual);
  }
  const devedores = [...mapaDevedores.values()].sort((a, b) => b.aberto - a.aberto);
  const totalDevido = centavos(devedores.reduce((s, d) => s + d.aberto, 0));

  // ---------------------------------------------------------------
  // 4. Pets sem atendimento há mais de X dias
  // ---------------------------------------------------------------
  const atendidos = new Set<string>();
  for (const c of consultasRecentes ?? []) atendidos.add(c.pet_id);
  for (const a of agendamentosRecentes ?? []) atendidos.add(a.pet_id);

  const sumidos = (pets ?? []).filter(
    (p) => !atendidos.has(p.id) && p.created_at.slice(0, 10) <= corte
  );

  // ---------------------------------------------------------------
  // Colunas
  // ---------------------------------------------------------------
  const colunasNovos: ColunaRelatorio<Novo>[] = [
    { rotulo: "Cadastro", className: "whitespace-nowrap", celula: (n) => formatData(n.quando) },
    { rotulo: "O que", celula: (n) => n.o_que },
    { rotulo: "Nome", celula: (n) => n.nome },
    { rotulo: "Tutor", celula: (n) => n.tutor },
    { rotulo: "Telefone", celula: (n) => <TelefoneTutor telefone={n.telefone} /> },
  ];

  const colunasAniversario: ColunaRelatorio<PetLinha>[] = [
    {
      rotulo: "Dia",
      className: "whitespace-nowrap",
      celula: (p) =>
        p.data_nascimento
          ? `${p.data_nascimento.slice(8, 10)}/${p.data_nascimento.slice(5, 7)}`
          : "—",
    },
    { rotulo: "Pet", celula: (p) => p.nome },
    { rotulo: "Espécie", celula: (p) => p.especie },
    { rotulo: "Idade que faz", celula: (p) => idadeDoPet(p.data_nascimento) },
    { rotulo: "Tutor", celula: (p) => p.tutor?.nome ?? "—" },
    {
      rotulo: "Telefone",
      celula: (p) => <TelefoneTutor telefone={p.tutor?.telefone} />,
    },
  ];

  const colunasDevedores: ColunaRelatorio<Devedor>[] = [
    { rotulo: "Tutor", celula: (d) => d.nome },
    { rotulo: "Telefone", celula: (d) => <TelefoneTutor telefone={d.telefone} /> },
    { rotulo: "Contas em aberto", numerica: true, celula: (d) => d.contas },
    {
      rotulo: "Vencida desde",
      className: "whitespace-nowrap",
      celula: (d) => (d.vencidoDesde ? formatDataISO(d.vencidoDesde) : "Em dia"),
    },
    { rotulo: "Saldo devedor", numerica: true, celula: (d) => formatBRL(d.aberto) },
  ];

  const colunasSumidos: ColunaRelatorio<PetLinha>[] = [
    { rotulo: "Pet", celula: (p) => p.nome },
    { rotulo: "Espécie", celula: (p) => p.especie },
    { rotulo: "Idade", celula: (p) => idadeDoPet(p.data_nascimento) },
    { rotulo: "Tutor", celula: (p) => p.tutor?.nome ?? "—" },
    {
      rotulo: "Telefone",
      celula: (p) => <TelefoneTutor telefone={p.tutor?.telefone} />,
    },
    {
      rotulo: "Cadastrado em",
      className: "whitespace-nowrap",
      celula: (p) => formatData(p.created_at),
    },
  ];

  const cards: ItemResumo[] = [
    { rotulo: "Novos cadastros", valor: novos.length, detalhe: "Tutores e pets no período" },
    {
      rotulo: "Aniversariantes",
      valor: aniversariantes.length,
      detalhe: `Mês de ${MESES[Number(mesAniversario) - 1]}`,
    },
    {
      rotulo: "Tutores devendo",
      valor: devedores.length,
      detalhe: `${formatBRL(totalDevido)} em aberto`,
    },
    {
      rotulo: "Pets para reativar",
      valor: sumidos.length,
      detalhe: `Sem atendimento há mais de ${dias} dias`,
    },
  ];

  const params = { de: periodo.de, ate: periodo.ate, dias: String(dias) };

  return (
    <FolhaRelatorio
      titulo="Tutores e pets"
      subtitulo={descricaoPeriodo(periodo)}
      clinica={clinica}
      periodo={descricaoPeriodo(periodo)}
    >
      <FiltrosRelatorio
        base={BASE}
        periodo={periodo}
        params={params}
        rotuloDe="Cadastros de"
        rotuloAte="Cadastros até"
      >
        <Campo
          rotulo="Sem atendimento há (dias)"
          htmlFor="dias"
          dica="De 30 a 1095 dias"
        >
          <Input
            id="dias"
            name="dias"
            type="number"
            min={30}
            max={1095}
            step={1}
            defaultValue={dias}
          />
        </Campo>
      </FiltrosRelatorio>

      <CartoesResumo itens={cards} />

      <TituloBloco
        titulo="Novos cadastros no período"
        detalhe={descricaoPeriodo(periodo)}
        icone={<UserPlus className="size-4" strokeWidth={1.8} aria-hidden />}
      />
      <TabelaRelatorio
        colunas={colunasNovos}
        linhas={novos}
        chave={(n) => n.chave}
        legenda="Tutores e pets cadastrados no período"
        vazio="Nenhum cadastro novo no período."
        larguraMinima="40rem"
        total={["Total", null, `${novos.length} cadastros`, null, null]}
      />

      <TituloBloco
        titulo={`Aniversariantes de ${MESES[Number(mesAniversario) - 1]}`}
        detalhe="Boa desculpa para uma mensagem carinhosa (e um agendamento)."
        icone={<Cake className="size-4" strokeWidth={1.8} aria-hidden />}
      />
      <TabelaRelatorio
        colunas={colunasAniversario}
        linhas={aniversariantes}
        chave={(p) => p.id}
        legenda="Pets que fazem aniversário no mês"
        vazio="Nenhum pet faz aniversário nesse mês."
        larguraMinima="42rem"
        total={["Total", null, null, null, `${aniversariantes.length} pets`, null]}
      />

      <TituloBloco
        titulo="Tutores com saldo devedor"
        detalhe="Contas a receber ainda em aberto, do maior saldo para o menor."
        icone={<Wallet className="size-4" strokeWidth={1.8} aria-hidden />}
      />
      <TabelaRelatorio
        colunas={colunasDevedores}
        linhas={devedores}
        chave={(d) => d.id}
        legenda="Tutores com contas a receber em aberto"
        vazio="Nenhum tutor com conta em aberto."
        larguraMinima="40rem"
        total={[
          "Total",
          null,
          null,
          `${devedores.length} tutores`,
          formatBRL(totalDevido),
        ]}
      />

      <TituloBloco
        titulo={`Pets sem atendimento há mais de ${dias} dias`}
        detalhe="Lista de reativação: ligue ou mande WhatsApp para trazer o pet de volta."
        icone={<PawPrint className="size-4" strokeWidth={1.8} aria-hidden />}
      />
      <TabelaRelatorio
        colunas={colunasSumidos}
        linhas={sumidos}
        chave={(p) => p.id}
        legenda="Pets sem atendimento recente"
        vazio="Todos os pets ativos passaram pela clínica nesse intervalo."
        larguraMinima="44rem"
        total={["Total", null, null, null, `${sumidos.length} pets`, null]}
      />

      <p className="mt-3 text-xs text-ink-muted print:hidden">
        A reativação considera consultas e agendamentos não cancelados desde{" "}
        {formatDataISO(corte)} e ignora pets marcados como falecidos e cadastros
        feitos depois dessa data.
      </p>
    </FolhaRelatorio>
  );
}
