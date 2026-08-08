import { notFound } from "next/navigation";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { getSessao } from "@/lib/auth";
import {
  DEFINICAO,
  planoQueInclui,
  SOBRE_RECURSO,
  temRecurso,
  type Recurso,
} from "@/lib/plano-conta";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Recurso do plano" };

/**
 * A tela que aparece quando alguém esbarra num recurso fora do plano.
 *
 * Ela vende em vez de barrar. Quem chegou aqui clicou justamente naquilo, e
 * esse é o melhor momento que existe para explicar o que o recurso faz — bem
 * melhor que uma página de preços que a pessoa nunca abriu.
 *
 * Por isso não existe "acesso negado" em lugar nenhum do texto: o assunto é
 * o que o recurso resolve, e o plano é só a consequência.
 */
export default async function RecursoDoPlanoPage({
  params,
}: {
  params: Promise<{ recurso: string }>;
}) {
  const { recurso } = await params;

  const sobre = SOBRE_RECURSO[recurso as Recurso];
  if (!sobre) notFound();

  const { conta } = await getSessao();

  // Já tem o recurso e caiu aqui? Foi endereço velho — manda para a página
  // do plano em vez de oferecer o que a pessoa já paga.
  if (temRecurso(conta.plano, recurso as Recurso)) {
    return (
      <div>
        <PageHeader
          titulo={sobre.nome}
          subtitulo="Este recurso já faz parte do seu plano."
          acao={<ButtonLink href="/assinatura">Ver meu plano</ButtonLink>}
        />
      </div>
    );
  }

  const alvo = planoQueInclui(recurso as Recurso);
  const definicao = DEFINICAO[alvo];
  const atual = DEFINICAO[(conta.plano as keyof typeof DEFINICAO) ?? "trial"];

  // O que MAIS vem junto na troca. Vender só o que a pessoa procurava seria
  // subestimar a oferta: quem sobe para o Completo por causa do WhatsApp
  // leva IA e nota fiscal no mesmo passo.
  const outros = definicao.recursos
    .filter((r) => r !== recurso && !atual?.recursos.includes(r))
    .map((r) => SOBRE_RECURSO[r]);

  return (
    <div>
      <PageHeader
        titulo={sobre.nome}
        subtitulo={`Faz parte do plano ${definicao.nome}`}
        acao={
          <ButtonLink href="/dashboard" variante="secondary">
            <ArrowLeft className="size-4" />
            Voltar
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Card>
          <div className="flex items-start gap-3">
            <span className="glass-forte flex size-11 shrink-0 items-center justify-center rounded-xl">
              <Lock className="size-5" strokeWidth={1.8} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-ink">{sobre.nome}</h2>
              <p className="mt-1 text-sm text-ink-muted">{sobre.explicacao}</p>
            </div>
          </div>

          {outros.length > 0 && (
            <div className="mt-5 border-t border-edge pt-4">
              <p className="mb-2 text-sm font-semibold text-ink">
                No plano {definicao.nome} vem junto:
              </p>
              <ul className="space-y-2">
                {outros.map((o) => (
                  <li key={o.nome} className="flex items-start gap-2 text-sm">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-brand-mint"
                      strokeWidth={2.4}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{o.nome}</span>
                      <span className="text-ink-muted"> — {o.explicacao}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Seu plano hoje
          </p>
          <p className="mt-1 text-lg font-bold text-ink">{atual?.nome ?? "Teste"}</p>
          <p className="mt-1 text-sm text-ink-muted">{atual?.resumo}</p>

          <div className="mt-4 border-t border-edge pt-4">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Para usar {sobre.nome.toLowerCase()}
            </p>
            <p className="mt-1 text-lg font-bold text-ink">{definicao.nome}</p>
            <p className="mt-1 text-sm text-ink-muted">{definicao.resumo}</p>
          </div>

          <ButtonLink href="/assinatura" className="mt-4 w-full">
            Ver os planos
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
