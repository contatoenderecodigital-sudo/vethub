import { Boxes, PackageX, TriangleAlert, Wallet } from "lucide-react";
import { formatBRL, hojeISO, formatDataISO } from "@/lib/format";
import {
  Estatistica,
  GradeEstatisticas,
  type EstatisticaProps,
} from "@/components/ui/estatistica";
import { Campo, Select } from "@/components/ui/form";
import { abrirRelatorio, type OpcaoSimples } from "../dados";
import {
  LIMITE_LINHAS,
  centavos,
  formatQuantidade,
  idDaUrl,
  opcaoDaUrl,
} from "../definicoes";
import { FiltrosRelatorio } from "../filtros-relatorio";
import { FolhaRelatorio } from "../impressao";
import { AvisoLimite } from "../resumo";
import { TabelaRelatorio, type ColunaRelatorio } from "../tabela-relatorio";

export const metadata = { title: "Relatório de posição de estoque" };

const BASE = "/relatorios/estoque";

const SITUACOES = ["abaixo", "zerados"] as const;

const ROTULO_SITUACAO: Record<string, string> = {
  abaixo: "Abaixo do mínimo",
  zerados: "Zerados",
};

interface ItemEstoque {
  id: string;
  nome: string;
  codigo: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number;
  grupo: { nome: string } | null;
  unidade: { sigla: string } | null;
}

export default async function RelatorioEstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; situacao?: string }>;
}) {
  const filtros = await searchParams;
  const grupo = idDaUrl(filtros.grupo);
  const situacao = opcaoDaUrl(filtros.situacao, SITUACOES);

  const { supabase, clinica } = await abrirRelatorio();

  let consulta = supabase
    .from("item")
    .select(
      "id, nome, codigo, estoque_atual, estoque_minimo, preco_custo, " +
        "grupo:grupo_id (nome), unidade:unidade_id (sigla)"
    )
    .eq("tipo", "produto")
    .eq("controla_estoque", true)
    .eq("ativo", true)
    .order("nome")
    .limit(LIMITE_LINHAS);

  if (grupo) consulta = consulta.eq("grupo_id", grupo);
  if (situacao === "zerados") consulta = consulta.lte("estoque_atual", 0);

  const [{ data }, { data: grupos }] = await Promise.all([
    consulta.returns<ItemEstoque[]>(),
    supabase
      .from("grupo_item")
      .select("id, nome")
      .in("tipo", ["produto", "ambos"])
      .order("nome")
      .limit(300)
      .returns<OpcaoSimples[]>(),
  ]);

  // "Abaixo do mínimo" compara duas colunas. O PostgREST não faz isso
  // direto, então o corte fica aqui (a consulta já veio filtrada pelo grupo).
  const todos = data ?? [];
  const itens =
    situacao === "abaixo"
      ? todos.filter(
          (i) => Number(i.estoque_minimo) > 0 && Number(i.estoque_atual) < Number(i.estoque_minimo)
        )
      : todos;

  let valorImobilizado = 0;
  let abaixoDoMinimo = 0;
  let zerados = 0;
  for (const item of itens) {
    const atual = Number(item.estoque_atual);
    const minimo = Number(item.estoque_minimo);
    valorImobilizado += atual > 0 ? atual * Number(item.preco_custo) : 0;
    if (atual <= 0) zerados += 1;
    else if (minimo > 0 && atual < minimo) abaixoDoMinimo += 1;
  }

  const cards: EstatisticaProps[] = [
    {
      rotulo: "Valor imobilizado",
      valor: formatBRL(centavos(valorImobilizado)),
      detalhe: "Estoque atual pelo preço de custo",
      icone: Wallet,
      tom: "neutro",
    },
    { rotulo: "Produtos", valor: itens.length, icone: Boxes },
    {
      rotulo: "Abaixo do mínimo",
      valor: abaixoDoMinimo,
      icone: TriangleAlert,
      tom: "atencao",
    },
    { rotulo: "Zerados", valor: zerados, icone: PackageX, tom: "critico" },
  ];

  const colunas: ColunaRelatorio<ItemEstoque>[] = [
    {
      rotulo: "Item",
      celula: (i) => (
        <>
          {i.nome}
          {i.codigo && (
            <span className="block text-xs text-ink-muted">Código {i.codigo}</span>
          )}
        </>
      ),
    },
    { rotulo: "Grupo", celula: (i) => i.grupo?.nome ?? "Sem grupo" },
    {
      rotulo: "Estoque atual",
      numerica: true,
      celula: (i) =>
        `${formatQuantidade(i.estoque_atual)} ${i.unidade?.sigla ?? "un"}`,
    },
    {
      rotulo: "Mínimo",
      numerica: true,
      celula: (i) => formatQuantidade(i.estoque_minimo),
    },
    {
      rotulo: "Custo unitário",
      numerica: true,
      celula: (i) => formatBRL(i.preco_custo),
    },
    {
      rotulo: "Valor em estoque",
      numerica: true,
      celula: (i) =>
        formatBRL(centavos(Math.max(0, Number(i.estoque_atual)) * Number(i.preco_custo))),
    },
    {
      rotulo: "Situação",
      celula: (i) => {
        const atual = Number(i.estoque_atual);
        const minimo = Number(i.estoque_minimo);
        if (atual <= 0) return "Zerado";
        if (minimo > 0 && atual < minimo) return "Abaixo do mínimo";
        return "Normal";
      },
    },
  ];

  const params = { grupo, situacao };
  const hoje = hojeISO();

  return (
    <FolhaRelatorio
      titulo="Posição de estoque"
      subtitulo={`Posição em ${formatDataISO(hoje)}`}
      clinica={clinica}
      periodo={`Posição em ${formatDataISO(hoje)}`}
    >
      <FiltrosRelatorio base={BASE} params={params} semPeriodo>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Grupo" htmlFor="grupo">
            <Select id="grupo" name="grupo" defaultValue={grupo ?? ""}>
              <option value="">Todos</option>
              {(grupos ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Situação" htmlFor="situacao">
            <Select id="situacao" name="situacao" defaultValue={situacao ?? ""}>
              <option value="">Todos os produtos</option>
              {SITUACOES.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO[s]}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
      </FiltrosRelatorio>

      <AvisoLimite
        quantidade={todos.length}
        dica="Filtre por grupo para ver a posição completa."
      />

      <GradeEstatisticas colunas={4} className="mb-4">
        {cards.map((c) => (
          <Estatistica key={c.rotulo} {...c} />
        ))}
      </GradeEstatisticas>

      <TabelaRelatorio
        colunas={colunas}
        linhas={itens}
        chave={(i) => i.id}
        legenda="Posição atual do estoque"
        vazio="Nenhum produto com controle de estoque nesse filtro."
        larguraMinima="52rem"
        total={[
          "Total",
          `${itens.length} ${itens.length === 1 ? "produto" : "produtos"}`,
          null,
          null,
          null,
          formatBRL(centavos(valorImobilizado)),
          null,
        ]}
      />

      <p className="mt-3 text-xs text-ink-muted print:hidden">
        Só entram produtos ativos com controle de estoque. Saldo negativo não
        soma valor.
      </p>
    </FolhaRelatorio>
  );
}
