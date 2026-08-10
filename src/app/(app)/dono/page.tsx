import Link from "next/link";
import { Building2, Handshake, Link2, Users } from "lucide-react";
import { exigirDono } from "@/lib/dono";
import { formatBRL, formatDataISO, hojeISO } from "@/lib/format";
import {
  CICLOS,
  DEFINICAO,
  PLANOS,
  SOBRE_CICLO,
  tetoDeUsuarios,
  type Ciclo,
  type PlanoConta,
} from "@/lib/plano-conta";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Estatistica } from "@/components/ui/estatistica";
import { Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { CampoData } from "@/components/ui/campo-data";
import { alternarParceiro, esticarTeste, mudarPlano, salvarParceiro } from "./actions";

export const metadata = { title: "Painel do dono" };

/**
 * O painel de quem é dono do VetHub, não de quem usa o VetHub.
 *
 * Enxerga TODAS as clínicas, muda plano na mão e apura a comissão de quem
 * indicou. Existe porque a cobrança ainda é por Pix combinado: o dono
 * recebe, entra aqui e libera o plano. Sem esta tela, vender antes de ter
 * gateway significaria editar o banco na unha a cada cliente.
 *
 * A proteção mora em src/lib/dono.ts, e por um motivo que vale repetir: a
 * permissão NÃO pode ser uma coluna no banco, porque o admin de uma clínica
 * consegue editar os usuários dela — inclusive ele mesmo.
 */

interface ClinicaLinha {
  id: string;
  nome: string;
  plano: string;
  ciclo: string;
  trial_termina_em: string | null;
  renova_em: string | null;
  limite_usuarios: number | null;
  origem_ref: string | null;
  created_at: string;
  parceiro: { id: string; nome: string } | null;
}

interface ParceiroLinha {
  id: string;
  nome: string;
  codigo: string;
  telefone: string | null;
  email: string | null;
  comissao_percentual: number;
  meses_de_comissao: number | null;
  observacao: string | null;
  ativo: boolean;
}

/** Quanto uma clínica paga por mês hoje. Zero enquanto está em teste. */
function mensalidade(plano: string, ciclo: string): number {
  const def = DEFINICAO[plano as PlanoConta];
  if (!def?.preco) return 0;
  return def.preco[(ciclo as Ciclo) ?? "mensal"] ?? def.preco.mensal;
}

export default async function DonoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aba?: string }>;
}) {
  const { erro, aba } = await searchParams;
  const { admin, email } = await exigirDono();
  const emParceiros = aba === "parceiros";

  const [{ data: clinicas }, { data: parceiros }, { data: usuarios }] = await Promise.all([
    admin
      .from("clinica")
      .select(
        "id, nome, plano, ciclo, trial_termina_em, renova_em, limite_usuarios, origem_ref, created_at, parceiro:parceiro_id (id, nome)"
      )
      .order("created_at", { ascending: false })
      .returns<ClinicaLinha[]>(),
    admin
      .from("parceiro")
      .select(
        "id, nome, codigo, telefone, email, comissao_percentual, meses_de_comissao, observacao, ativo"
      )
      .order("nome")
      .returns<ParceiroLinha[]>(),
    admin.from("usuario").select("clinica_id").returns<{ clinica_id: string }[]>(),
  ]);

  const lista = clinicas ?? [];
  const porClinica = new Map<string, number>();
  for (const u of usuarios ?? []) {
    porClinica.set(u.clinica_id, (porClinica.get(u.clinica_id) ?? 0) + 1);
  }

  const pagantes = lista.filter((c) => c.plano !== "trial");
  const receita = pagantes.reduce((s, c) => s + mensalidade(c.plano, c.ciclo), 0);
  const emTeste = lista.filter((c) => c.plano === "trial");
  const hoje = hojeISO();
  const vencendo = emTeste.filter(
    (c) => c.trial_termina_em && c.trial_termina_em >= hoje
  ).length;

  // Comissão de cada parceiro: o que as clínicas dele pagam, na porcentagem
  // combinada. Só conta quem já saiu do teste — teste não gera receita, logo
  // não gera comissão.
  const comissaoDe = new Map<string, { clinicas: number; pagantes: number; valor: number }>();
  for (const c of lista) {
    if (!c.parceiro?.id) continue;
    const p = parceiros?.find((x) => x.id === c.parceiro!.id);
    const atual = comissaoDe.get(c.parceiro.id) ?? { clinicas: 0, pagantes: 0, valor: 0 };
    atual.clinicas += 1;
    if (c.plano !== "trial" && p) {
      atual.pagantes += 1;
      atual.valor += (mensalidade(c.plano, c.ciclo) * Number(p.comissao_percentual)) / 100;
    }
    comissaoDe.set(c.parceiro.id, atual);
  }

  return (
    <div>
      <PageHeader titulo="Painel do dono" subtitulo={`Entrou como ${email}`} />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Estatistica rotulo="Clínicas" valor={String(lista.length)} icone={Building2} />
        <Estatistica rotulo="Pagantes" valor={String(pagantes.length)} icone={Users} />
        <Estatistica rotulo="Em teste" valor={`${emTeste.length} (${vencendo} no prazo)`} icone={Building2} />
        <Estatistica rotulo="Receita mensal" valor={formatBRL(receita)} icone={Handshake} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { valor: "", rotulo: `Clínicas (${lista.length})` },
          { valor: "parceiros", rotulo: `Parceiros (${parceiros?.length ?? 0})` },
        ].map((t) => {
          const ativo = (aba ?? "") === t.valor;
          return (
            <Link
              key={t.valor || "clinicas"}
              href={t.valor ? `/dono?aba=${t.valor}` : "/dono"}
              aria-current={ativo ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-4 text-sm transition-colors ${
                ativo
                  ? "bg-white font-semibold text-brand-dark"
                  : "glass font-medium text-ink-muted hover:text-ink"
              }`}
            >
              {t.rotulo}
            </Link>
          );
        })}
      </div>

      {!emParceiros ? (
        <div className="space-y-4">
          {lista.map((c) => {
            const teto = tetoDeUsuarios(c.plano, c.limite_usuarios);
            const usados = porClinica.get(c.id) ?? 0;
            const expirado = !!c.trial_termina_em && c.trial_termina_em < hoje;

            return (
              <Card key={c.id}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-ink">
                      {c.nome}
                      {c.plano === "trial" ? (
                        expirado ? (
                          <Badge tom="danger">Teste vencido</Badge>
                        ) : (
                          <Badge tom="info">Em teste</Badge>
                        )
                      ) : (
                        <Badge tom="success">
                          {DEFINICAO[c.plano as PlanoConta]?.nome ?? c.plano} ·{" "}
                          {formatBRL(mensalidade(c.plano, c.ciclo))}/mês
                        </Badge>
                      )}
                    </h2>
                    <p className="text-sm text-ink-muted">
                      Criada em {formatDataISO(c.created_at.slice(0, 10))} ·{" "}
                      {usados} de {teto ?? "∞"} usuários
                      {c.trial_termina_em && ` · teste até ${formatDataISO(c.trial_termina_em)}`}
                      {c.renova_em && ` · renova em ${formatDataISO(c.renova_em)}`}
                    </p>
                    {(c.parceiro || c.origem_ref) && (
                      <p className="mt-0.5 text-sm text-ink">
                        Indicada por{" "}
                        <strong>{c.parceiro?.nome ?? c.origem_ref}</strong>
                      </p>
                    )}
                  </div>

                  {c.plano === "trial" && (
                    <form action={esticarTeste.bind(null, c.id, 14)}>
                      <SubmitButton variante="ghost" tamanho="sm" className="min-h-11">
                        Esticar teste 14 dias
                      </SubmitButton>
                    </form>
                  )}
                </div>

                <form
                  action={mudarPlano.bind(null, c.id)}
                  className="grid gap-3 border-t border-edge pt-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
                >
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-muted">Plano</span>
                    <Select name="plano" defaultValue={c.plano}>
                      {PLANOS.map((p) => (
                        <option key={p} value={p}>
                          {DEFINICAO[p].nome}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-muted">Ciclo</span>
                    <Select name="ciclo" defaultValue={c.ciclo}>
                      {CICLOS.map((ci) => (
                        <option key={ci} value={ci}>
                          {SOBRE_CICLO[ci].nome}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-muted">
                      Limite de usuários
                    </span>
                    <Input
                      name="limite_usuarios"
                      inputMode="numeric"
                      defaultValue={c.limite_usuarios ?? ""}
                      placeholder="usa o do plano"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-muted">
                      Renova em
                    </span>
                    <CampoData
                      name="renova_em"
                      defaultValue={c.renova_em ?? ""}
                      aria-label="Data de renovação"
                    />
                  </label>

                  <SubmitButton variante="secondary" className="min-h-11">
                    Salvar
                  </SubmitButton>
                </form>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-base font-semibold text-ink">Novo parceiro</h2>
            <form
              action={salvarParceiro.bind(null, null)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Nome <span className="text-red-100">*</span>
                </span>
                <Input name="nome" required maxLength={120} placeholder="Ex.: Marcos Vendas" />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Código do link <span className="text-red-100">*</span>
                </span>
                <Input name="codigo" required maxLength={40} placeholder="marcos" />
                <span className="mt-1 block text-xs text-ink-muted">
                  Só minúsculas, números e hífen. Vai no link e é ditado por telefone.
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">Telefone</span>
                <Input name="telefone" maxLength={30} placeholder="49 99999-0000" />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">E-mail</span>
                <Input name="email" maxLength={160} />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">Comissão (%)</span>
                <Input name="comissao_percentual" defaultValue="20" inputMode="decimal" />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Meses de comissão
                </span>
                <Input
                  name="meses_de_comissao"
                  inputMode="numeric"
                  placeholder="vazio = para sempre"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-ink">Observação</span>
                <Textarea name="observacao" rows={2} maxLength={300} />
              </label>

              <div className="sm:col-span-2">
                <SubmitButton>Cadastrar parceiro</SubmitButton>
              </div>
            </form>
          </Card>

          {(parceiros ?? []).map((p) => {
            const c = comissaoDe.get(p.id) ?? { clinicas: 0, pagantes: 0, valor: 0 };
            const link = `https://vethub-tau.vercel.app/cadastro?ref=${p.codigo}`;
            return (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-ink">
                      {p.nome}
                      {!p.ativo && <Badge tom="neutro">Desligado</Badge>}
                    </h3>
                    <p className="text-sm text-ink-muted">
                      {p.comissao_percentual}% ·{" "}
                      {p.meses_de_comissao
                        ? `por ${p.meses_de_comissao} meses`
                        : "enquanto a clínica pagar"}
                      {p.telefone && ` · ${p.telefone}`}
                    </p>

                    <p className="mt-2 flex items-center gap-2 text-sm">
                      <Link2 className="size-4 shrink-0 text-ink-muted" aria-hidden />
                      <code className="rounded bg-white/15 px-2 py-1 text-ink">{link}</code>
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                      Comissão do mês
                    </p>
                    <p className="text-2xl font-bold text-ink tabular-nums">
                      {formatBRL(c.valor)}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {c.clinicas} indicada{c.clinicas === 1 ? "" : "s"} · {c.pagantes} pagando
                    </p>
                    <form action={alternarParceiro.bind(null, p.id, p.ativo)} className="mt-2">
                      <SubmitButton variante="ghost" tamanho="sm" className="min-h-11">
                        {p.ativo ? "Desligar" : "Religar"}
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
