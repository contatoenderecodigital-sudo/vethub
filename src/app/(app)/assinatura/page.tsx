import Link from "next/link";
import { Check, Minus, Users } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import {
  CICLOS,
  DEFINICAO,
  economiaAnual,
  reais,
  SOBRE_CICLO,
  SOBRE_RECURSO,
  tetoDeUsuarios,
  trialExpirou,
  type Ciclo,
  type PlanoConta,
  type Recurso,
} from "@/lib/plano-conta";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Assinatura" };

/**
 * O plano que a clínica paga ao VetHub.
 *
 * Chama-se "Assinatura", e não "Planos", porque /planos já é outra coisa
 * neste sistema: o plano de saúde que a clínica vende ao tutor. Dois nomes
 * iguais para coisas opostas confundiriam o dono e o suporte.
 */
const VENDIDOS: PlanoConta[] = ["essencial", "profissional", "completo"];

/** Todo recurso que aparece na comparação, na ordem em que faz sentido ler. */
const LINHAS: Recurso[] = [
  "internacao",
  "fiscal",
  "comissoes",
  "planos_de_saude",
  "relatorios_avancados",
  "multi_unidade",
  "whatsapp",
  "ia",
];

/** Recursos ainda não construídos: prometer sem avisar seria vender fumaça. */
const A_CONSTRUIR: Recurso[] = ["whatsapp", "ia", "fiscal"];

/**
 * O ciclo que a tela mostra por padrão é o de 12 meses.
 *
 * Não é truque de vitrine: é o preço de verdade, o que foi calculado contra
 * o custo real do concorrente. Os ciclos curtos é que são o acréscimo de
 * quem não quer se comprometer.
 */
const PADRAO: Ciclo = "anual";

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const { ciclo: pedido } = await searchParams;
  const ciclo: Ciclo = CICLOS.includes(pedido as Ciclo) ? (pedido as Ciclo) : PADRAO;

  const { conta, supabase } = await getSessao();

  const { count: usuarios } = await supabase
    .from("usuario")
    .select("id", { count: "exact", head: true });

  const atual = (conta.plano ?? "trial") as PlanoConta;
  const teto = tetoDeUsuarios(conta.plano, conta.limite_usuarios);
  const expirou = trialExpirou(conta.plano, conta.trial_termina_em, hojeISO());

  return (
    <div>
      <PageHeader
        titulo="Assinatura"
        subtitulo="O plano da sua clínica no VetHub"
      />

      {/* Situação da conta */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-ink">
                {DEFINICAO[atual]?.nome ?? "Teste gratuito"}
              </h2>
              {atual === "trial" &&
                (expirou ? (
                  <Badge tom="danger">Teste encerrado</Badge>
                ) : (
                  <Badge tom="info">Em teste</Badge>
                ))}
            </div>
            <p className="mt-1 text-sm text-ink-muted">{DEFINICAO[atual]?.resumo}</p>

            {atual === "trial" && conta.trial_termina_em && !expirou && (
              <p className="mt-2 text-sm text-ink">
                Seu teste vai até{" "}
                <strong>
                  {new Date(`${conta.trial_termina_em}T12:00:00`).toLocaleDateString(
                    "pt-BR"
                  )}
                </strong>
                .
              </p>
            )}

            {atual !== "trial" && (
              <p className="mt-2 text-sm text-ink">
                Pagamento {SOBRE_CICLO[(conta.ciclo as Ciclo) ?? "mensal"]?.nome}
                {conta.renova_em && (
                  <>
                    {" · renova em "}
                    <strong>
                      {new Date(`${conta.renova_em}T12:00:00`).toLocaleDateString("pt-BR")}
                    </strong>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              <Users className="size-3.5" strokeWidth={2} aria-hidden />
              Usuários
            </p>
            <p className="mt-1 text-2xl font-bold text-ink tabular-nums">
              {usuarios ?? 0}
              {teto != null && (
                <span className="text-base font-medium text-ink-muted"> de {teto}</span>
              )}
            </p>
            {teto == null && <p className="text-xs text-ink-muted">sem limite</p>}
          </div>
        </div>
      </Card>

      {/* Escolha do ciclo. São links, e não botões com JavaScript: a escolha
          fica no endereço, então dá para mandar "o preço anual" pelo
          WhatsApp e a pessoa abrir vendo exatamente o que você viu. */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Forma de pagamento"
          className="glass-forte inline-flex rounded-xl p-1"
        >
          {CICLOS.map((c) => {
            const escolhido = c === ciclo;
            return (
              <Link
                key={c}
                href={`/assinatura?ciclo=${c}`}
                scroll={false}
                aria-current={escolhido ? "true" : undefined}
                className={`flex min-h-11 items-center rounded-lg px-4 text-sm font-medium transition-colors ${
                  escolhido
                    ? "bg-white font-semibold text-brand-dark"
                    : "text-ink-muted hover:bg-white/15 hover:text-ink"
                }`}
              >
                {SOBRE_CICLO[c].nome}
              </Link>
            );
          })}
        </div>
        {SOBRE_CICLO[ciclo].descontoRotulo && (
          <span className="text-sm font-semibold text-ink">
            {SOBRE_CICLO[ciclo].descontoRotulo}
          </span>
        )}
      </div>

      {/* Os três planos */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {VENDIDOS.map((id) => {
          const p = DEFINICAO[id];
          const ehAtual = id === atual;
          const economia = economiaAnual(id, ciclo);

          return (
            <Card
              key={id}
              className={ehAtual ? "border-white/60 ring-2 ring-white/50" : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-ink">{p.nome}</h3>
                {ehAtual && <Badge tom="brand">Seu plano</Badge>}
              </div>
              <p className="mt-1 min-h-10 text-sm text-ink-muted">{p.resumo}</p>

              {p.preco && (
                <div className="mt-3">
                  <p className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-ink tabular-nums">
                      {reais(p.preco[ciclo])}
                    </span>
                    <span className="text-sm text-ink-muted">/mês</span>
                  </p>

                  {/* O preço cheio riscado ao lado: sem ele, o desconto é uma
                      afirmação; com ele, é uma conta que a pessoa confere. */}
                  {ciclo !== "mensal" && (
                    <p className="mt-0.5 text-sm text-ink-muted">
                      <span className="line-through">{reais(p.preco.mensal)}</span> no
                      mês a mês
                    </p>
                  )}

                  {economia > 0 && (
                    <p className="mt-2 inline-block rounded-lg bg-emerald-300/25 px-2 py-1 text-sm font-semibold text-ink">
                      Economize {reais(economia)} por ano
                    </p>
                  )}
                </div>
              )}

              <p className="mt-3 flex items-center gap-1.5 text-sm text-ink">
                <Users className="size-4 shrink-0 text-ink-muted" strokeWidth={1.8} aria-hidden />
                {p.usuarios == null ? "Usuários ilimitados" : `Até ${p.usuarios} usuários`}
              </p>

              <ul className="mt-3 space-y-1.5 border-t border-edge pt-3">
                {LINHAS.map((r) => {
                  const tem = p.recursos.includes(r);
                  return (
                    <li
                      key={r}
                      className={`flex items-start gap-2 text-sm ${
                        tem ? "text-ink" : "text-ink-muted"
                      }`}
                    >
                      {tem ? (
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-brand-mint"
                          strokeWidth={2.4}
                          aria-hidden
                        />
                      ) : (
                        <Minus className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
                      )}
                      <span className="min-w-0">
                        {SOBRE_RECURSO[r].nome}
                        {tem && A_CONSTRUIR.includes(r) && (
                          <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                            em breve
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card>
        <p className="text-sm text-ink-muted">
          Todos os planos incluem agenda, prontuário, receituário, banho e tosa,
          cadastro de tutores e pets, estoque, compras, PDV e financeiro. A
          diferença entre eles está na lista acima.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Sem taxa de implantação e sem multa de cancelamento. Nos planos de 6 e
          12 meses o desconto vale enquanto o período contratado estiver
          correndo, e o pagamento pode ser parcelado no cartão.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Para trocar de plano, fale com o VetHub pelo e-mail de contato da sua
          conta.
        </p>
      </Card>
    </div>
  );
}
