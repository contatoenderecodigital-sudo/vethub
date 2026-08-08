import { Check, Minus, Users } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import {
  DEFINICAO,
  SOBRE_RECURSO,
  tetoDeUsuarios,
  trialExpirou,
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
 *
 * Não há preço nesta tela de propósito: a tabela de valores ainda não foi
 * definida, e um número errado aqui é pior que número nenhum. Quando os
 * valores existirem, entram na definição de cada plano.
 */
const VENDIDOS: PlanoConta[] = ["essencial", "profissional", "completo"];

/** Todo recurso que aparece na comparação, na ordem em que faz sentido ler. */
const LINHAS: Recurso[] = [
  "internacao",
  "comissoes",
  "planos_de_saude",
  "relatorios_avancados",
  "multi_unidade",
  "whatsapp",
  "ia",
  "fiscal",
];

/** Recursos ainda não construídos: prometer sem avisar seria vender fumaça. */
const A_CONSTRUIR: Recurso[] = ["whatsapp", "ia", "fiscal"];

export default async function AssinaturaPage() {
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

      {/* Os três planos */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {VENDIDOS.map((id) => {
          const p = DEFINICAO[id];
          const ehAtual = id === atual;
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
                        tem ? "text-ink" : "text-ink-muted/70"
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
          Para trocar de plano, fale com o VetHub pelo e-mail de contato da sua
          conta.
        </p>
      </Card>
    </div>
  );
}
