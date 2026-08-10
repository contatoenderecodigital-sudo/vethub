import Link from "next/link";
import { Clock } from "lucide-react";
import type { SituacaoDoTeste } from "@/lib/trial";

/**
 * A faixa que conta os dias que faltam.
 *
 * Só aparece na reta final. Avisar desde o primeiro dia treinaria a pessoa a
 * ignorar a faixa muito antes de ela importar — e quando importasse, já
 * seria parte do cenário.
 *
 * Fica âmbar nos últimos dias e vermelha quando vence. Cor não é o único
 * sinal: o texto diz exatamente o que está acontecendo, para quem não
 * distingue as duas.
 */
export function AvisoDoTeste({ situacao }: { situacao: SituacaoDoTeste }) {
  if (!situacao.emTeste) return null;
  if (!situacao.vencido && !situacao.avisar) return null;

  const dias = situacao.dias ?? 0;

  const texto = situacao.vencido
    ? "Seu teste terminou. A clínica está em modo somente leitura: dá para ver e imprimir tudo, mas não criar registro novo."
    : dias <= 0
      ? "Hoje é o último dia do seu teste gratuito."
      : `Faltam ${dias} ${dias === 1 ? "dia" : "dias"} do seu teste gratuito.`;

  return (
    <div
      role="status"
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ${
        situacao.vencido ? "bg-red-400/25" : "bg-amber-300/30"
      }`}
    >
      <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
        <Clock className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        {texto}
      </p>
      <Link
        href={situacao.vencido ? "/assinatura/expirou" : "/assinatura"}
        className="flex min-h-11 shrink-0 items-center rounded-lg bg-white px-4 text-sm font-semibold text-brand-dark"
      >
        {situacao.vencido ? "Reativar clínica" : "Ver os planos"}
      </Link>
    </div>
  );
}
