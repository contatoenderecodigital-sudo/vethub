import Link from "next/link";
import { History, LockKeyhole, Wallet } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Campo, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { abrirCaixa } from "./actions";
import { CampoMoeda } from "./campo-moeda";
import { AvisoCaixaAntigo } from "./aviso-caixa";
import { PdvTerminal } from "./pdv-terminal";

export const metadata = { title: "PDV" };

interface CaixaAberto {
  id: string;
  abertura: string;
  valor_abertura: number;
  usuario: { nome: string } | { nome: string }[] | null;
}

interface CaixaFechado {
  fechamento: string | null;
  valor_fechamento: number | null;
  usuario: { nome: string } | { nome: string }[] | null;
}

/** O embed do Supabase pode vir como objeto ou array: normaliza. */
function nomeDe(
  relacao: { nome: string } | { nome: string }[] | null | undefined
): string | null {
  const registro = Array.isArray(relacao) ? relacao[0] : relacao;
  return registro?.nome ?? null;
}

export default async function PdvPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; orcamento?: string; consulta?: string }>;
}) {
  const { erro, orcamento: orcamentoId, consulta: consultaId } = await searchParams;
  const { supabase, usuario, unidade } = await getSessao();

  // O caixa é POR UNIDADE: cada filial abre e fecha o seu, em horários
  // diferentes. Sem este filtro, quem trabalha no Centro veria o caixa da
  // Matriz e venderia no lugar errado.
  const { data: caixa } = await supabase
    .from("caixa")
    .select("id, abertura, valor_abertura, usuario:aberto_por (nome)")
    .eq("status", "aberto")
    .eq("unidade_id", unidade?.id ?? "")
    .maybeSingle<CaixaAberto>();

  // Venda que já chega começada, de uma das duas origens.
  //
  // Do orçamento, só o APROVADO entra: em aberto ainda pode mudar de valor e
  // recusado não vira venda nenhuma. Da consulta, entra qualquer uma, porque
  // ali quem decide cobrar é a recepção no balcão.
  //
  // O orçamento ganha quando os dois vierem na mesma URL: ele traz a lista
  // inteira de itens, a consulta traz só a consulta.
  const inicio = orcamentoId
    ? await carregarOrcamento(supabase, orcamentoId)
    : consultaId
      ? await carregarConsulta(supabase, consultaId)
      : undefined;

  const alerta = erro && (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md"
    >
      {erro}
    </p>
  );

  // ---------- caixa fechado: só dá para abrir ----------
  if (!caixa) {
    const { data: ultimo } = await supabase
      .from("caixa")
      .select("fechamento, valor_fechamento, usuario:fechado_por (nome)")
      .eq("status", "fechado")
      .order("fechamento", { ascending: false })
      .limit(1)
      .maybeSingle<CaixaFechado>();

    return (
      <div>
        <PageHeader titulo="PDV" subtitulo="Venda rápida no balcão" />
        {alerta}

        <div className="glass mx-auto max-w-md rounded-2xl p-6">
          <div className="mb-4 flex flex-col items-center text-center">
            <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-white/20 text-white">
              <LockKeyhole className="size-7" strokeWidth={1.8} />
            </span>
            <h2 className="text-lg font-bold text-ink">Caixa fechado</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {ultimo?.fechamento
                ? `Último fechamento em ${formatDataHora(ultimo.fechamento)}${
                    nomeDe(ultimo.usuario) ? ` por ${nomeDe(ultimo.usuario)}` : ""
                  }${
                    ultimo.valor_fechamento != null
                      ? `, com ${formatBRL(ultimo.valor_fechamento)} em caixa`
                      : ""
                  }.`
                : "Nenhum caixa foi fechado até agora."}
            </p>
          </div>

          <form action={abrirCaixa} className="space-y-3">
            <Campo
              rotulo="Valor de abertura (R$)"
              htmlFor="valor_abertura"
              obrigatorio
              dica="Troco que está na gaveta no começo do turno."
            >
              <CampoMoeda
                id="valor_abertura"
                name="valor_abertura"
                valorInicial="0,00"
                required
              />
            </Campo>

            <Campo rotulo="Observação" htmlFor="observacao">
              <Input
                id="observacao"
                name="observacao"
                maxLength={300}
                placeholder="Opcional. Ex.: turno da manhã"
              />
            </Campo>

            <SubmitButton className="w-full" tamanho="lg" carregando="Abrindo…">
              <Wallet className="size-4" />
              Abrir caixa
            </SubmitButton>
          </form>
        </div>

        <p className="mt-4 text-center">
          <Link
            href="/vendas"
            className="inline-flex items-center gap-1.5 text-sm font-medium link-vidro"
          >
            <History className="size-4" />
            Ver histórico de vendas
          </Link>
        </p>
      </div>
    );
  }

  // ---------- caixa aberto: terminal de venda ----------
  const abertoPor = nomeDe(caixa.usuario);

  return (
    <div>
      <PageHeader
        titulo="PDV"
        subtitulo={`Caixa aberto em ${formatDataHora(caixa.abertura)}${
          abertoPor ? ` por ${abertoPor}` : ""
        } · abertura de ${formatBRL(caixa.valor_abertura)}`}
        acao={
          <>
            <Link
              href="/vendas"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
            >
              <History className="size-4" />
              Vendas
            </Link>
            <Link
              href="/pdv/caixa"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
            >
              <Wallet className="size-4" />
              Caixa
            </Link>
          </>
        }
      />
      {alerta}
      <AvisoCaixaAntigo abertura={caixa.abertura} />

      <PdvTerminal vendedor={usuario.nome} inicio={inicio} />
    </div>
  );
}

/**
 * Traz o orçamento aprovado no formato que o terminal entende.
 *
 * O item do orçamento é texto livre com valor; quando ele tem um item do
 * catálogo por trás, o vínculo vem junto para a venda dar baixa no estoque.
 */
/**
 * Traz a consulta no formato que o terminal entende.
 *
 * Preenche o tutor e já joga a consulta no carrinho. Não adivinha o resto:
 * o que mais foi feito no atendimento está escrito em texto na conduta, e
 * chutar item de venda a partir de prosa daria venda errada — a recepção
 * acrescenta o que faltar, que é o trabalho dela mesmo.
 *
 * O que isso economiza são os dois passos mais lentos do balcão: procurar o
 * tutor certo entre milhares e lembrar quanto custa a consulta.
 */
async function carregarConsulta(
  supabase: Awaited<ReturnType<typeof getSessao>>["supabase"],
  id: string
) {
  const { data: consulta } = await supabase
    .from("consulta")
    .select("id, pet:pet_id (nome, tutor:tutor_id (id, nome))")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      pet: {
        nome: string;
        tutor: { id: string; nome: string } | { id: string; nome: string }[] | null;
      } | null;
    }>();

  if (!consulta) return undefined;

  const tutorBruto = Array.isArray(consulta.pet?.tutor)
    ? consulta.pet?.tutor[0]
    : consulta.pet?.tutor;

  // A consulta em si, pelo preço da tabela da clínica. Se ela não estiver no
  // catálogo, o carrinho começa vazio em vez de inventar um valor.
  const { data: servico } = await supabase
    .from("item")
    .select("id, nome, preco_venda")
    .eq("tipo", "servico")
    .eq("ativo", true)
    .ilike("nome", "consulta%")
    .order("preco_venda", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; nome: string; preco_venda: number }>();

  return {
    tutor: tutorBruto ? { id: tutorBruto.id, rotulo: tutorBruto.nome } : null,
    itens: servico
      ? [
          {
            item_id: servico.id,
            descricao: servico.nome,
            quantidade: 1,
            valor_unitario: Number(servico.preco_venda),
          },
        ]
      : [],
  };
}

async function carregarOrcamento(
  supabase: Awaited<ReturnType<typeof getSessao>>["supabase"],
  id: string
) {
  const { data: orcamento } = await supabase
    .from("orcamento")
    .select("id, status, pet:pet_id (nome, tutor:tutor_id (id, nome))")
    .eq("id", id)
    .eq("status", "aprovado")
    .maybeSingle<{
      id: string;
      status: string;
      pet: {
        nome: string;
        tutor: { id: string; nome: string } | { id: string; nome: string }[] | null;
      } | null;
    }>();

  if (!orcamento) return undefined;

  const { data: itens } = await supabase
    .from("orcamento_item")
    .select("item_id, descricao, quantidade, valor_unitario")
    .eq("orcamento_id", id)
    .order("id")
    .returns<
      {
        item_id: string | null;
        descricao: string;
        quantidade: number;
        valor_unitario: number;
      }[]
    >();

  const tutorBruto = Array.isArray(orcamento.pet?.tutor)
    ? orcamento.pet?.tutor[0]
    : orcamento.pet?.tutor;

  return {
    id: orcamento.id,
    numero: orcamento.id.slice(-6).toUpperCase(),
    tutor: tutorBruto
      ? { id: tutorBruto.id, rotulo: tutorBruto.nome }
      : null,
    itens: (itens ?? []).map((i) => ({
      item_id: i.item_id,
      descricao: i.descricao,
      quantidade: Number(i.quantidade),
      valor_unitario: Number(i.valor_unitario),
    })),
  };
}
