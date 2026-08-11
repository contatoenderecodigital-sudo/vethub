import { redirect } from "next/navigation";
import {
  FilePlus2,
  FileX2,
  History,
  PencilLine,
  ShieldCheck,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Histórico de alterações" };

const POR_PAGINA = 40;

type Acao = "criou" | "alterou" | "excluiu";

interface Registro {
  id: number;
  usuario_nome: string | null;
  tabela: string;
  registro_id: string | null;
  acao: Acao;
  mudancas: Record<string, unknown> | null;
  criado_em: string;
}

const ROTULO_TABELA: Record<string, string> = {
  venda: "Venda",
  conta: "Conta",
  baixa: "Recebimento",
  caixa: "Caixa",
  item: "Produto/serviço",
  movimentacao_estoque: "Estoque",
  tutor: "Tutor",
  pet: "Pet",
  usuario: "Equipe",
  unidade: "Unidade",
};

const ESTILO_ACAO: Record<Acao, { icone: typeof FilePlus2; tom: "success" | "info" | "danger"; verbo: string }> = {
  criou: { icone: FilePlus2, tom: "success", verbo: "criou" },
  alterou: { icone: PencilLine, tom: "info", verbo: "alterou" },
  excluiu: { icone: FileX2, tom: "danger", verbo: "excluiu" },
};

/** Campos que não interessam a quem lê o histórico. */
const ESCONDIDOS = new Set([
  "id",
  "clinica_id",
  "unidade_id",
  "created_at",
  "updated_at",
  "registrado_por",
]);

const ROTULO_CAMPO: Record<string, string> = {
  nome: "Nome",
  preco_venda: "Preço de venda",
  preco_custo: "Preço de custo",
  valor: "Valor",
  valor_pago: "Valor pago",
  status: "Situação",
  telefone: "Telefone",
  email: "E-mail",
  papel: "Perfil",
  ativo: "Ativo",
  ativa: "Ativa",
  quantidade: "Quantidade",
  vencimento: "Vencimento",
  observacao: "Observação",
};

const rotuloCampo = (c: string) =>
  ROTULO_CAMPO[c] ?? c.replace(/_/g, " ").replace(/^./, (l) => l.toUpperCase());

/** Deixa o valor legível: dinheiro como dinheiro, vazio como travessão. */
function legivel(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "-";
  if (typeof valor === "boolean") return valor ? "sim" : "não";
  if (/preco|valor/.test(campo) && !Number.isNaN(Number(valor))) {
    return formatBRL(Number(valor));
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

/** Uma alteração vira "Preço de venda: R$ 100,00 → R$ 150,00". */
function descrever(r: Registro): string[] {
  const dados = r.mudancas ?? {};
  const campos = Object.keys(dados).filter((c) => !ESCONDIDOS.has(c));

  if (r.acao === "alterou") {
    return campos.slice(0, 6).map((c) => {
      const par = dados[c] as { de?: unknown; para?: unknown };
      return `${rotuloCampo(c)}: ${legivel(c, par?.de)} → ${legivel(c, par?.para)}`;
    });
  }

  // Criar e excluir: o que identifica o registro basta.
  const identidade = ["nome", "descricao", "codigo", "valor"]
    .filter((c) => dados[c] != null && dados[c] !== "")
    .slice(0, 2)
    .map((c) => `${rotuloCampo(c)}: ${legivel(c, dados[c])}`);

  return identidade.length ? identidade : ["registro sem descrição"];
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ tabela?: string; pagina?: string }>;
}) {
  const { tabela, pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  const { supabase, usuario } = await getSessao();

  // A política do banco já barra quem não é admin; aqui é só para a pessoa
  // ver uma tela em vez de uma lista vazia sem explicação.
  if (usuario.papel !== "admin") redirect("/dashboard");

  let query = supabase
    .from("auditoria")
    .select("id, usuario_nome, tabela, registro_id, acao, mudancas, criado_em", {
      count: "exact",
    })
    .order("id", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (tabela) query = query.eq("tabela", tabela);

  const { data, count } = await query.returns<Registro[]>();
  const registros = data ?? [];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  return (
    <div>
      <PageHeader
        titulo="Histórico de alterações"
        subtitulo={
          count != null
            ? `${count} ${count === 1 ? "registro" : "registros"}`
            : undefined
        }
      />

      <Card className="mb-4">
        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden />
          <span>
            Tudo que mexe em dinheiro, preço, cadastro de cliente e equipe fica
            registrado aqui, com quem fez e quando. O registro é feito pelo
            banco de dados e <strong className="text-ink">não pode ser apagado
            por ninguém</strong>, inclusive por quem tem acesso de
            administrador.
          </span>
        </p>
      </Card>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          name="tabela"
          defaultValue={tabela ?? ""}
          aria-label="Filtrar por tipo de registro"
          className="h-11 w-auto min-w-52 lg:h-10"
        >
          <option value="">Tudo</option>
          {Object.entries(ROTULO_TABELA).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Select>
        <Button type="submit" variante="secondary">
          Filtrar
        </Button>
      </form>

      {registros.length === 0 ? (
        <EmptyState
          icone={<History className="size-7" strokeWidth={1.8} />}
          titulo="Nada registrado ainda"
          mensagem="Assim que alguém criar, alterar ou excluir algo importante, aparece aqui."
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {registros.map((r) => {
              const estilo = ESTILO_ACAO[r.acao];
              const Icone = estilo.icone;
              return (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
                    aria-hidden
                  >
                    <Icone className="size-4" strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink">
                      <strong className="font-medium">
                        {r.usuario_nome ?? "Rotina do sistema"}
                      </strong>
                      <span className="text-ink-muted">{estilo.verbo}</span>
                      <Badge tom={estilo.tom}>
                        {ROTULO_TABELA[r.tabela] ?? r.tabela}
                      </Badge>
                    </p>

                    <ul className="mt-0.5 space-y-0.5">
                      {descrever(r).map((linha, i) => (
                        <li key={i} className="text-xs text-ink-muted">
                          {linha}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                    {formatDataHora(r.criado_em)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl="/configuracoes/auditoria"
        params={{ tabela }}
      />
    </div>
  );
}
