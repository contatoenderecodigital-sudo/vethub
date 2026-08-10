import Link from "next/link";
import { Clock, Download, Eye, Lock } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataISO } from "@/lib/format";
import { DEFINICAO, reais } from "@/lib/plano-conta";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { IconeWhatsapp } from "@/components/icone-whatsapp";

export const metadata = { title: "Seu teste terminou" };

/** WhatsApp de vendas. O mesmo da tela de assinatura. */
const WHATSAPP = "5549999533072";

/**
 * A tela de quem chegou no 15º dia.
 *
 * Ela NÃO é uma porta trancada. A clínica continua vendo tudo, imprimindo e
 * exportando — o que ela perde é criar coisa nova. Bloquear a leitura seria
 * sequestrar o prontuário de animais que estão em tratamento, e o dado é da
 * clínica, não nosso: fora que a LGPD garante a ela o acesso à própria base.
 *
 * O tom também é escolha. Quem chega aqui gostou o bastante para usar 14
 * dias; tratar como caloteiro é o jeito mais rápido de perder uma venda que
 * já estava quase feita.
 */
export default async function TesteExpiradoPage() {
  const { conta } = await getSessao();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Seu teste terminou"
        subtitulo={
          conta.trial_termina_em
            ? `Foram 14 dias, até ${formatDataISO(conta.trial_termina_em)}`
            : "Foram 14 dias de teste"
        }
      />

      <Card className="mb-5">
        <div className="flex items-start gap-3">
          <span className="glass-forte flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Clock className="size-5" strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink">
              Sua clínica continua aqui, inteira
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Nada foi apagado. Você continua vendo tudo, imprimindo receita e
              exportando seus dados. O que está pausado é criar registro novo:
              agendamento, consulta, venda e cadastro.
            </p>
          </div>
        </div>

        <ul className="mt-4 grid gap-2 border-t border-edge pt-4 sm:grid-cols-2">
          <li className="flex items-center gap-2 text-sm text-ink">
            <Eye className="size-4 shrink-0 text-brand-mint" strokeWidth={2} aria-hidden />
            Ver prontuário, agenda e financeiro
          </li>
          <li className="flex items-center gap-2 text-sm text-ink">
            <Download className="size-4 shrink-0 text-brand-mint" strokeWidth={2} aria-hidden />
            Imprimir e exportar tudo
          </li>
          <li className="flex items-center gap-2 text-sm text-ink-muted">
            <Lock className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Novo agendamento e nova consulta
          </li>
          <li className="flex items-center gap-2 text-sm text-ink-muted">
            <Lock className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Vender no PDV e lançar no financeiro
          </li>
        </ul>
      </Card>

      <Card className="mb-5">
        <h2 className="text-lg font-bold text-ink">Para voltar a atender hoje</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Escolha um plano e me chame no WhatsApp. Libero na hora, e tudo que
          você cadastrou nesses 14 dias continua onde está.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["essencial", "profissional", "completo"] as const).map((id) => {
            const p = DEFINICAO[id];
            return (
              <a
                key={id}
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                  `Olá! Meu teste do VetHub terminou e quero contratar o plano ${p.nome} (${reais(p.preco!.anual)}/mês no plano de 12 meses).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass flex flex-col rounded-xl p-4 transition-colors hover:bg-white/20"
              >
                <span className="font-bold text-ink">{p.nome}</span>
                <span className="mt-1 text-2xl font-bold text-ink tabular-nums">
                  {reais(p.preco!.anual)}
                </span>
                <span className="text-sm text-ink-muted">/mês em 12 meses</span>
                <span className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <IconeWhatsapp className="size-4 shrink-0" aria-hidden />
                  Quero este
                </span>
              </a>
            );
          })}
        </div>
      </Card>

      <Card>
        <p className="text-sm text-ink-muted">
          Quer ver a comparação completa dos planos antes de decidir?{" "}
          <Link href="/assinatura" className="link-vidro font-medium">
            Ver todos os planos
          </Link>
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Precisa de mais alguns dias para testar? Chame no WhatsApp e a gente
          estica. É melhor você decidir com calma do que decidir com pressa.
        </p>
      </Card>
    </div>
  );
}
