import { Check } from "lucide-react";
import { DEFINICAO, reais } from "@/lib/plano-conta";

/**
 * O que a mesma clínica pagaria nos concorrentes.
 *
 * Este bloco é o argumento mais forte que o VetHub tem, e até hoje ele só
 * existia num arquivo de pesquisa que nenhum cliente vai ler. A comparação
 * não é de preço de tabela — é do CUSTO REAL de uma clínica que precisa de
 * internação e nota fiscal, que é onde os outros cobram módulo à parte.
 *
 * Valores lidos nas páginas oficiais em 04/08/2026
 * (docs/concorrentes/mercado.md). Se forem atualizar, atualizem a data:
 * número velho apresentado como atual é propaganda enganosa, e o
 * concorrente tem todo o direito de reclamar.
 */
const LIDO_EM = "agosto de 2026";

interface Concorrente {
  nome: string;
  usuarios: string;
  base: number;
  internacao: number;
  fiscal: number;
}

const CONCORRENTES: Concorrente[] = [
  { nome: "SimplesVet", usuarios: "3 usuários", base: 359, internacao: 136, fiscal: 153 },
  { nome: "Vetsoft", usuarios: "5 usuários", base: 315, internacao: 97, fiscal: 97 },
  { nome: "Vetwork", usuarios: "5 usuários", base: 259.9, internacao: 119.9, fiscal: 70 },
];

const total = (c: Concorrente) => c.base + c.internacao + c.fiscal;

/**
 * Preço de concorrente vai com centavo.
 *
 * `reais()` arredonda, e arredondar para CIMA o preço do outro é o tipo de
 * detalhe que transforma uma comparação honesta em propaganda enganosa:
 * R$ 259,90 virava "R$ 260". Os nossos preços são redondos de propósito e
 * continuam usando `reais()`.
 */
const exato = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Comparacao() {
  const nosso = DEFINICAO.profissional.preco!.anual;
  const maisCaro = Math.max(...CONCORRENTES.map(total));
  const economia = Math.round(((maisCaro - nosso) / maisCaro) * 100);

  return (
    <section className="glass rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-bold text-ink">
        A mesma clínica, nos outros sistemas
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Uma clínica que precisa de internação e nota fiscal. Nos concorrentes,
        os dois são módulos cobrados à parte do plano.
      </p>

      {/* Rolagem própria: a tabela tem 5 colunas e não cabe em celular.
          Sem isto a PÁGINA inteira rolaria de lado, que é o defeito que a
          auditoria de design mais pega. */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge text-left">
              <th className="pb-2 font-semibold text-ink">Sistema</th>
              <th className="pb-2 text-right font-medium text-ink-muted">Plano</th>
              <th className="pb-2 text-right font-medium text-ink-muted">Internação</th>
              <th className="pb-2 text-right font-medium text-ink-muted">Fiscal</th>
              <th className="pb-2 text-right font-semibold text-ink">Total</th>
            </tr>
          </thead>
          <tbody>
            {CONCORRENTES.map((c) => (
              <tr key={c.nome} className="border-b border-edge/60">
                <td className="py-2.5">
                  <span className="font-medium text-ink">{c.nome}</span>
                  <span className="block text-xs text-ink-muted">{c.usuarios}</span>
                </td>
                <td className="py-2.5 text-right text-ink-muted tabular-nums">
                  {exato(c.base)}
                </td>
                <td className="py-2.5 text-right text-ink-muted tabular-nums">
                  +{exato(c.internacao)}
                </td>
                <td className="py-2.5 text-right text-ink-muted tabular-nums">
                  +{exato(c.fiscal)}
                </td>
                <td className="py-2.5 text-right font-semibold text-ink tabular-nums">
                  {exato(total(c))}
                </td>
              </tr>
            ))}

            {/* A nossa linha é a única com fundo sólido: ela precisa ganhar a
                leitura mesmo de quem só bateu o olho na tabela. */}
            <tr className="bg-white text-brand-dark">
              <td className="rounded-l-lg py-3 pl-2">
                <span className="font-bold">VetHub Profissional</span>
                <span className="block text-xs opacity-75">8 usuários</span>
              </td>
              <td className="py-3 text-right font-semibold tabular-nums">
                {reais(nosso)}
              </td>
              <td className="py-3 text-right">
                <Check className="ml-auto size-4" strokeWidth={2.6} aria-label="incluso" />
              </td>
              <td className="py-3 text-right">
                <Check className="ml-auto size-4" strokeWidth={2.6} aria-label="incluso" />
              </td>
              <td className="rounded-r-lg py-3 pr-2 text-right font-bold tabular-nums">
                {reais(nosso)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-ink">
        <strong>Até {economia}% mais barato</strong>, com internação e nota
        fiscal já dentro — e ainda com WhatsApp oficial, que os outros vendem
        como serviço à parte.
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Valores dos concorrentes lidos nas páginas oficiais em {LIDO_EM}.
        Comparação com o plano de 12 meses do VetHub.
      </p>
    </section>
  );
}
