import Link from "next/link";
import { History, LockKeyhole, Wallet } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Campo, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { abrirCaixa } from "./actions";
import { CampoMoeda } from "./campo-moeda";
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
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: caixa } = await supabase
    .from("caixa")
    .select("id, abertura, valor_abertura, usuario:aberto_por (nome)")
    .eq("status", "aberto")
    .maybeSingle<CaixaAberto>();

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

      <PdvTerminal vendedor={usuario.nome} />
    </div>
  );
}
