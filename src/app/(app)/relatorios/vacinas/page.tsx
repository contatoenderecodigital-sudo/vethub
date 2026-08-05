import { diasAte, formatDataISO, hojeISO } from "@/lib/format";
import { TIPOS_PROTOCOLO, type TipoProtocolo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Campo, Input, Select } from "@/components/ui/form";
import { abrirRelatorio } from "../dados";
import { TelefoneTutor } from "../contato";
import {
  LIMITE_LINHAS,
  deslocarDia,
  inteiroDaUrl,
  opcaoDaUrl,
} from "../definicoes";
import { FiltrosRelatorio } from "../filtros-relatorio";
import { FolhaRelatorio } from "../impressao";
import { AvisoLimite, CartoesResumo, type ItemResumo } from "../resumo";
import { TabelaRelatorio, type ColunaRelatorio } from "../tabela-relatorio";

export const metadata = { title: "Relatório de vacinas a vencer" };

const BASE = "/relatorios/vacinas";

/** Janela padrão de "vence em X dias". */
const DIAS_PADRAO = 30;
const DIAS_MINIMO = 1;
const DIAS_MAXIMO = 365;

const SITUACOES = ["vencidos", "avencer", "todos"] as const;
type Situacao = (typeof SITUACOES)[number];

const ROTULO_SITUACAO: Record<Situacao, string> = {
  vencidos: "Só os vencidos",
  avencer: "Só os que vencem no prazo",
  todos: "Todos (vencidos e a vencer)",
};

const TIPOS = TIPOS_PROTOCOLO.map((t) => t.valor);

const ROTULO_TIPO_PROTOCOLO = Object.fromEntries(
  TIPOS_PROTOCOLO.map((t) => [t.valor, t.rotulo])
) as Record<TipoProtocolo, string>;

interface ProtocoloLinha {
  id: string;
  tipo: TipoProtocolo;
  nome: string;
  dose: string | null;
  data_aplicacao: string;
  proxima_dose: string;
  pet: {
    id: string;
    nome: string;
    especie: string;
    falecido: boolean;
    tutor: { id: string; nome: string; telefone: string } | null;
  } | null;
}

/** Texto de dias no plural certo. */
function textoDias(dias: number): string {
  const n = Math.abs(dias);
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/**
 * Situação do reforço: vermelho quando já passou, âmbar dentro da janela do
 * filtro e verde quando ainda há folga. É o que orienta a ligação do dia.
 */
function BadgeSituacao({ proxima, janela }: { proxima: string; janela: number }) {
  const dias = diasAte(proxima);
  if (dias === null) return <Badge tom="neutro">Sem data</Badge>;
  if (dias < 0) return <Badge tom="danger">Vencida há {textoDias(dias)}</Badge>;
  if (dias === 0) return <Badge tom="pending">Vence hoje</Badge>;
  if (dias <= janela) return <Badge tom="pending">Vence em {textoDias(dias)}</Badge>;
  return <Badge tom="success">Vence em {textoDias(dias)}</Badge>;
}

export default async function RelatorioVacinasPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string; situacao?: string; tipo?: string }>;
}) {
  const filtros = await searchParams;
  const dias = inteiroDaUrl(filtros.dias, DIAS_PADRAO, DIAS_MINIMO, DIAS_MAXIMO);
  const situacao = opcaoDaUrl(filtros.situacao, SITUACOES) ?? "todos";
  const tipo = opcaoDaUrl(filtros.tipo, TIPOS);

  const { supabase, clinica } = await abrirRelatorio();

  const hoje = hojeISO();
  const limite = deslocarDia(hoje, dias);

  let consulta = supabase
    .from("protocolo_saude")
    .select(
      "id, tipo, nome, dose, data_aplicacao, proxima_dose, " +
        "pet:pet_id (id, nome, especie, falecido, tutor:tutor_id (id, nome, telefone))"
    )
    .not("proxima_dose", "is", null)
    .order("proxima_dose")
    .limit(LIMITE_LINHAS);

  if (tipo) consulta = consulta.eq("tipo", tipo);

  // Vencidos: reforço que já passou da data. A vencer: dentro da janela.
  if (situacao === "vencidos") consulta = consulta.lt("proxima_dose", hoje);
  else if (situacao === "avencer") {
    consulta = consulta.gte("proxima_dose", hoje).lte("proxima_dose", limite);
  } else {
    consulta = consulta.lte("proxima_dose", limite);
  }

  const { data } = await consulta.returns<ProtocoloLinha[]>();

  // Lista de ação comercial: pet falecido não recebe ligação de reforço.
  const linhas = (data ?? []).filter((p) => p.pet && !p.pet.falecido);

  let vencidos = 0;
  let aVencer = 0;
  const pets = new Set<string>();

  for (const linha of linhas) {
    if (linha.pet) pets.add(linha.pet.id);
    if (linha.proxima_dose < hoje) vencidos += 1;
    else if (linha.proxima_dose <= limite) aVencer += 1;
  }

  const cards: ItemResumo[] = [
    {
      rotulo: "Reforços vencidos",
      valor: vencidos,
      detalhe: "A data do reforço já passou",
    },
    {
      rotulo: `Vencem em ${dias} dias`,
      valor: aVencer,
      detalhe: `Até ${formatDataISO(limite)}`,
    },
    {
      rotulo: "Pets para contatar",
      valor: pets.size,
      detalhe: "Pets distintos na lista",
    },
    {
      rotulo: "Protocolos na lista",
      valor: linhas.length,
      detalhe: "Vacinas, vermífugos e antiparasitários",
    },
  ];

  const colunas: ColunaRelatorio<ProtocoloLinha>[] = [
    {
      rotulo: "Situação",
      className: "whitespace-nowrap",
      celula: (p) => <BadgeSituacao proxima={p.proxima_dose} janela={dias} />,
    },
    { rotulo: "Pet", celula: (p) => p.pet?.nome ?? "—" },
    { rotulo: "Espécie", celula: (p) => p.pet?.especie ?? "—" },
    { rotulo: "Tutor", celula: (p) => p.pet?.tutor?.nome ?? "—" },
    {
      rotulo: "Telefone",
      celula: (p) => <TelefoneTutor telefone={p.pet?.tutor?.telefone} />,
    },
    { rotulo: "Tipo", celula: (p) => ROTULO_TIPO_PROTOCOLO[p.tipo] ?? p.tipo },
    {
      rotulo: "Produto",
      celula: (p) => (
        <>
          {p.nome}
          {p.dose && <span className="block text-xs text-ink-muted">{p.dose}</span>}
        </>
      ),
    },
    {
      rotulo: "Aplicação",
      className: "whitespace-nowrap",
      celula: (p) => formatDataISO(p.data_aplicacao),
    },
    {
      rotulo: "Próxima dose",
      className: "whitespace-nowrap",
      celula: (p) => formatDataISO(p.proxima_dose),
    },
  ];

  const params = {
    dias: String(dias),
    situacao,
    tipo,
  };

  const descricao =
    situacao === "vencidos"
      ? "Reforços vencidos"
      : situacao === "avencer"
        ? `Reforços vencendo até ${formatDataISO(limite)}`
        : `Vencidos e vencendo até ${formatDataISO(limite)}`;

  return (
    <FolhaRelatorio
      titulo="Vacinas a vencer"
      subtitulo={`${descricao} · lista de reativação de cliente: ligue ou mande WhatsApp para trazer o pet de volta.`}
      clinica={clinica}
      periodo={descricao}
    >
      <FiltrosRelatorio base={BASE} params={params} semPeriodo>
        <div className="min-w-48 flex-1">
          <Campo rotulo="Situação" htmlFor="situacao">
            <Select id="situacao" name="situacao" defaultValue={situacao}>
              {SITUACOES.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO[s]}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="min-w-40 flex-1">
          <Campo
            rotulo="Vencem em (dias)"
            htmlFor="dias"
            dica={`De ${DIAS_MINIMO} a ${DIAS_MAXIMO} dias`}
          >
            <Input
              id="dias"
              name="dias"
              type="number"
              min={DIAS_MINIMO}
              max={DIAS_MAXIMO}
              step={1}
              defaultValue={dias}
            />
          </Campo>
        </div>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Tipo" htmlFor="tipo">
            <Select id="tipo" name="tipo" defaultValue={tipo ?? ""}>
              <option value="">Todos</option>
              {TIPOS_PROTOCOLO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.plural}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
      </FiltrosRelatorio>

      <AvisoLimite
        quantidade={data?.length ?? 0}
        dica="Reduza a janela de dias ou filtre por tipo para ver a lista completa."
      />

      <CartoesResumo itens={cards} />

      <TabelaRelatorio
        colunas={colunas}
        linhas={linhas}
        chave={(p) => p.id}
        legenda="Protocolos de saúde com reforço vencido ou a vencer"
        vazio="Nenhum reforço vencido ou a vencer nesse filtro."
        larguraMinima="66rem"
        total={[
          "Total",
          null,
          null,
          null,
          null,
          null,
          `${linhas.length} ${linhas.length === 1 ? "protocolo" : "protocolos"}`,
          null,
          `${pets.size} ${pets.size === 1 ? "pet" : "pets"}`,
        ]}
      />

      <p className="mt-3 text-xs text-ink-muted print:hidden">
        Entram apenas protocolos com data de próxima dose preenchida, ordenados
        do mais urgente para o menos urgente. Pets marcados como falecidos ficam
        de fora. O telefone abre uma conversa no WhatsApp.
      </p>
    </FolhaRelatorio>
  );
}
