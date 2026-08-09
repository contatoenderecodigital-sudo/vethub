import { Check, Sparkles } from "lucide-react";
import { CLINICA_PRONTA, reais } from "@/lib/plano-conta";
import { IconeWhatsapp } from "@/components/icone-whatsapp";

/**
 * O serviço de deixar a clínica pronta para usar.
 *
 * Fica DEPOIS dos planos de propósito: primeiro a pessoa escolhe onde vai
 * assinar, depois decide se quer fazer a configuração sozinha ou entregar
 * para nós. Oferecer o serviço antes do plano seria vender o acessório antes
 * do produto.
 *
 * O bloco é largo, e não um quarto cartão ao lado dos planos, porque não é
 * uma alternativa a eles — é um complemento. Uma coluna extra faria a pessoa
 * comparar preço de plano com preço de serviço, que são coisas diferentes.
 */
export function ClinicaPronta({ whatsapp }: { whatsapp: string }) {
  const parcela = CLINICA_PRONTA.valor / CLINICA_PRONTA.parcelas;

  const texto =
    `Olá! Quero saber sobre a Clínica Pronta do VetHub ` +
    `(${reais(CLINICA_PRONTA.valor)}, configuração completa e treinamento).`;

  return (
    <section className="glass-forte rounded-2xl p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-center">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            <Sparkles className="size-4 text-brand-mint" strokeWidth={2.2} aria-hidden />
            Serviço opcional
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">Clínica Pronta</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Você não configura nada. A gente entrega o sistema funcionando com
            a sua clínica dentro, e treina sua equipe.
          </p>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CLINICA_PRONTA.entrega.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-brand-mint"
                  strokeWidth={2.4}
                  aria-hidden
                />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* O preço mora numa caixa própria: é outro tipo de compra, uma vez
            só, e misturar com a mensalidade confunde as duas. */}
        <div className="rounded-xl bg-white p-5 text-center text-brand-dark">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-70">
            Pagamento único
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {CLINICA_PRONTA.parcelas}× {reais(parcela)}
          </p>
          <p className="mt-0.5 text-sm opacity-75">
            ou {reais(CLINICA_PRONTA.valor)} à vista
          </p>

          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noopener noreferrer"
            /* Verde FIXO, e não `brand-dark`: a cor da marca acompanha o
               tema e clareia no modo claro. E `tinta-clara-fixa` no lugar de
               `text-white` porque o modo claro reescreve o branco para
               grafite — que é o certo sobre o vidro e o errado aqui, onde o
               botão tem fundo escuro próprio. */
            className="tinta-clara-fixa mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            <IconeWhatsapp className="size-4 shrink-0" aria-hidden />
            Quero minha clínica pronta
          </a>

          {/* Escassez que é verdade, não truque de venda: são 28 horas por
              clínica, e o mês tem o que tem. */}
          <p className="mt-3 text-xs opacity-70">
            Poucas vagas por mês — cada implantação é acompanhada de perto.
          </p>
        </div>
      </div>
    </section>
  );
}
