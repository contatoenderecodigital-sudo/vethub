import Link from "next/link";
import {
  BadgeCheck,
  Check,
  Clock,
  HeartHandshake,
  Minus,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import {
  CICLOS,
  CLINICA_PRONTA,
  cotaDe,
  custoDeImplantacao,
  IMPLANTACAO,
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
import { IconeWhatsapp } from "@/components/icone-whatsapp";
import { ClinicaPronta } from "./clinica-pronta";

export const metadata = { title: "Assinatura" };

/**
 * A tela de planos.
 *
 * Ela VENDE, não informa. A versão anterior listava os três planos com preço
 * e um visto do lado de cada recurso, e nenhum botão para contratar — o
 * cliente lia a tabela, concordava com tudo e não tinha o que fazer em
 * seguida.
 *
 * Chama-se "Assinatura", e não "Planos", porque /planos já é outra coisa
 * neste sistema: o plano de saúde que a clínica vende ao tutor.
 */
const VENDIDOS: PlanoConta[] = ["essencial", "profissional", "completo"];

/**
 * O plano que a página empurra.
 *
 * É o Profissional por dois motivos que apontam para o mesmo lado: atende a
 * clínica de 2 a 8 pessoas, que é a persona dominante do mercado, e é o que
 * deixa mais dinheiro depois do custo de atender (ver
 * scripts/simulacao-precos.mjs). Destacar o mais caro afastaria; destacar o
 * mais barato empobreceria a base.
 */
const DESTAQUE: PlanoConta = "profissional";

/** Os recursos na ordem em que fazem sentido ler, do concreto ao futuro. */
const LINHAS: Recurso[] = [
  "internacao",
  "fiscal",
  "whatsapp",
  "comissoes",
  "planos_de_saude",
  "relatorios_avancados",
  "multi_unidade",
  "ia",
];

/** Ainda não construídos: prometer sem avisar seria vender fumaça. */
const A_CONSTRUIR: Recurso[] = ["whatsapp", "ia", "fiscal"];

/**
 * O que já vem em TODOS os planos.
 *
 * Precisa estar visível: sem esta lista, quem olha o Essencial vê uma coluna
 * de traços e conclui que ele não faz nada — quando na verdade ele já é a
 * clínica inteira funcionando.
 */
const EM_TODOS = [
  "Agenda e prontuário",
  "Receituário",
  "Banho e tosa",
  "Tutores e pets",
  "Estoque e compras",
  "PDV e financeiro",
];

/** WhatsApp de vendas do VetHub, no formato que o wa.me exige (55 + DDD). */
const WHATSAPP_VENDAS = "5549999533072";

/**
 * Para onde vai quem clica em "Quero este plano".
 *
 * Enquanto não existe checkout, contratar é conversa — e a conversa começa
 * com a mensagem PRONTA, dizendo qual plano e qual ciclo. Sem isso a pessoa
 * chega no WhatsApp com a tela em branco, tem que explicar tudo de novo, e é
 * exatamente aí que ela desiste.
 *
 * Quando o pagamento existir, este link vira a rota do checkout.
 */
function linkDeContratacao(plano: PlanoConta, ciclo: Ciclo) {
  const def = DEFINICAO[plano];
  const texto =
    `Olá! Quero contratar o plano ${def.nome} do VetHub ` +
    `(${SOBRE_CICLO[ciclo].nome}${def.preco ? `, ${reais(def.preco[ciclo])}/mês` : ""}).`;
  return `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent(texto)}`;
}

const PADRAO: Ciclo = "anual";

/** Quantos dias faltam para a data, contando de hoje. */
function diasAte(data: string, hoje: string): number {
  const ms =
    new Date(`${data}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime();
  return Math.round(ms / 86400000);
}

const dataBR = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");

const GARANTIAS = [
  {
    icone: HeartHandshake,
    titulo: "Nós migramos sua base",
    texto: "Trazemos tutores, pets e histórico do sistema atual. Grátis nos planos de 6 e 12 meses.",
  },
  {
    icone: ShieldCheck,
    titulo: "Sem multa de cancelamento",
    texto: "Sai quando quiser. Não existe fidelidade.",
  },
  {
    icone: Clock,
    titulo: "14 dias de teste",
    texto: "Tudo liberado, sem pedir cartão.",
  },
  {
    icone: Wallet,
    titulo: "Preço na tela",
    texto: "Sem \"fale com um consultor\" para saber quanto custa.",
  },
];

/** As objeções de venda, respondidas antes de virarem pergunta. */
const DUVIDAS = [
  {
    p: "Posso trocar de plano depois?",
    r: "Pode, a qualquer momento. Subindo, o novo plano vale na hora. Descendo, vale na próxima renovação.",
  },
  {
    p: "O plano de 12 meses tem fidelidade?",
    r: "Não. O desconto é por pagamento adiantado, não é contrato. Quem sai antes para de pagar as parcelas seguintes e perde o desconto dos meses já usados, sem multa.",
  },
  {
    p: "O que acontece se eu passar da cota de notas ou mensagens?",
    r: "O que passar entra na fatura do mês, pelo valor do excedente. A emissão de nota fiscal nunca é interrompida: sua clínica não para de vender por causa disso.",
  },
  {
    p: "O que é a taxa de implantação?",
    r: "É a migração da sua base do sistema antigo (tutores, pets e histórico) mais o treinamento da equipe. Custa R$ 497 no plano mês a mês e é gratuita nos planos de 6 e 12 meses.",
  },
  {
    p: "Qual a diferença entre a implantação e a Clínica Pronta?",
    r: `A implantação (R$ 497, grátis em 6 e 12 meses) traz sua base do sistema antigo (tutores, pets e histórico) e o resto você configura. A Clínica Pronta (${reais(CLINICA_PRONTA.valor)} em ${CLINICA_PRONTA.parcelas}×) é tudo pronto: catálogo com preços, agenda, financeiro, WhatsApp, fiscal e a equipe treinada. Você abre o sistema e começa a atender.`,
  },
  {
    p: "Preciso pagar tudo de uma vez no plano anual?",
    r: "Não. Dá para parcelar no cartão ao longo do período contratado.",
  },
  {
    p: "E se eu tiver mais gente que o limite do plano?",
    r: "O sistema avisa antes de você criar o usuário que não cabe. Aí é só subir de plano, ou falar com a gente, porque limite negociado existe.",
  },
];

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
  const emTeste = atual === "trial";
  const teto = tetoDeUsuarios(conta.plano, conta.limite_usuarios);
  const expirou = trialExpirou(conta.plano, conta.trial_termina_em, hojeISO());
  const diasDeTeste = conta.trial_termina_em
    ? diasAte(conta.trial_termina_em, hojeISO())
    : null;

  return (
    <div>
      <PageHeader titulo="Assinatura" subtitulo="Escolha o plano da sua clínica" />

      {/* Situação da conta */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-ink">
                {DEFINICAO[atual]?.nome ?? "Teste gratuito"}
              </h2>
              {emTeste &&
                (expirou ? (
                  <Badge tom="danger">Teste encerrado</Badge>
                ) : (
                  <Badge tom="info">Em teste</Badge>
                ))}
            </div>

            {emTeste && !expirou && diasDeTeste != null ? (
              <p className="mt-1 text-sm text-ink">
                {diasDeTeste <= 0 ? (
                  <>
                    Seu teste termina <strong>hoje</strong>.
                  </>
                ) : (
                  <>
                    Faltam{" "}
                    <strong>
                      {diasDeTeste} {diasDeTeste === 1 ? "dia" : "dias"}
                    </strong>{" "}
                    de teste, até {dataBR(conta.trial_termina_em!)}. Tudo está liberado
                    até lá.
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">{DEFINICAO[atual]?.resumo}</p>
            )}

            {!emTeste && (
              <p className="mt-1 text-sm text-ink">
                Pagamento {SOBRE_CICLO[(conta.ciclo as Ciclo) ?? "mensal"]?.nome}
                {conta.renova_em && (
                  <>
                    {" "}
                    · renova em <strong>{dataBR(conta.renova_em)}</strong>
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

      {/* Ciclo de pagamento. São links, e não botões com JavaScript: a escolha
          fica no endereço, então dá para mandar "o preço anual" pelo WhatsApp
          e a pessoa abrir vendo exatamente o que você viu. */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-3 lg:mb-10">
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
                className={`flex min-h-11 items-center rounded-lg px-4 text-sm transition-colors ${
                  escolhido
                    ? "bg-white font-semibold text-brand-dark"
                    : "font-medium text-ink-muted hover:bg-white/15 hover:text-ink"
                }`}
              >
                {SOBRE_CICLO[c].nome}
              </Link>
            );
          })}
        </div>
        {SOBRE_CICLO[ciclo].descontoRotulo && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Sparkles className="size-4 text-brand-mint" strokeWidth={2.2} aria-hidden />
            {SOBRE_CICLO[ciclo].descontoRotulo}
          </span>
        )}
      </div>

      {/* Os três planos */}
      <div className="mb-5 grid items-start gap-4 lg:grid-cols-3">
        {VENDIDOS.map((id) => {
          const p = DEFINICAO[id];
          const ehAtual = id === atual;
          const ehDestaque = id === DESTAQUE;
          const economia = economiaAnual(id, ciclo);
          const implantacao = custoDeImplantacao(ciclo);

          return (
            <div
              key={id}
              className={`glass relative flex h-full flex-col rounded-2xl p-4 sm:p-6 ${
                ehAtual
                  ? "ring-2 ring-brand-mint"
                  : ehDestaque
                    ? "ring-2 ring-white/70 lg:-mt-2 lg:pb-8"
                    : ""
              }`}
            >
              {ehDestaque && !ehAtual && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-bold whitespace-nowrap text-brand-dark shadow-lg shadow-black/15">
                  Mais escolhido
                </span>
              )}

              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-ink">{p.nome}</h3>
                {ehAtual && <Badge tom="brand">Seu plano</Badge>}
              </div>
              <p className="mt-1 min-h-10 text-sm text-ink-muted">{p.resumo}</p>

              {p.preco && (
                <div className="mt-4">
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-ink tabular-nums">
                      {reais(p.preco[ciclo])}
                    </span>
                    <span className="text-sm text-ink-muted">/mês</span>
                  </p>

                  {/* O preço cheio riscado: sem ele o desconto é uma
                      afirmação; com ele, é uma conta que a pessoa confere. */}
                  {ciclo !== "mensal" ? (
                    <p className="mt-1 text-sm text-ink-muted">
                      <span className="line-through">{reais(p.preco.mensal)}</span> no mês
                      a mês
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-ink-muted">
                      {reais(p.preco.anual)}/mês no plano de 12 meses
                    </p>
                  )}

                  {economia > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-300/25 px-2.5 py-1 text-sm font-semibold text-ink">
                      <Wallet className="size-4" strokeWidth={2.2} aria-hidden />
                      Economize {reais(economia)} por ano
                    </p>
                  )}

                  {/* A implantação fica colada no preço, e não escondida no
                      rodapé: condição que só aparece na hora de fechar é o
                      que faz a pessoa desistir com razão. */}
                  <p className="mt-2 text-sm text-ink-muted">
                    {implantacao > 0 ? (
                      <>
                        + {reais(implantacao)} de implantação,{" "}
                        <strong className="text-ink">grátis em 6 ou 12 meses</strong>
                      </>
                    ) : (
                      <>
                        <strong className="text-ink">Implantação grátis</strong> (
                        {reais(IMPLANTACAO.valor)} no mês a mês)
                      </>
                    )}
                  </p>
                </div>
              )}

              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-ink">
                <Users
                  className="size-4 shrink-0 text-ink-muted"
                  strokeWidth={1.8}
                  aria-hidden
                />
                {p.usuarios == null ? "Usuários ilimitados" : `Até ${p.usuarios} usuários`}
              </p>

              <ul className="mt-3 space-y-2 border-t border-edge pt-3">
                {LINHAS.map((r) => {
                  const tem = p.recursos.includes(r);
                  const cota = cotaDe(id, r);
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
                        <Minus
                          className="mt-0.5 size-4 shrink-0"
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0">
                        {SOBRE_RECURSO[r].nome}
                        {tem && A_CONSTRUIR.includes(r) && (
                          <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                            em breve
                          </span>
                        )}
                        {tem && cota && (
                          <span className="block text-ink-muted">
                            {cota.incluso.toLocaleString("pt-BR")} {cota.unidade}/mês
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* mt-auto empurra o botão para o rodapé: os três cartões ficam
                  alinhados embaixo mesmo com listas de tamanhos diferentes. */}
              <div className="mt-auto pt-5">
                {ehAtual ? (
                  <span className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-edge text-sm font-semibold text-ink-muted">
                    <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
                    Seu plano atual
                  </span>
                ) : (
                  <a
                    href={linkDeContratacao(id, ciclo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
                      ehDestaque
                        ? "bg-white text-brand-dark shadow-lg shadow-black/10 hover:bg-white/90"
                        : "border border-white/40 bg-white/15 text-ink backdrop-blur-md hover:bg-white/25"
                    }`}
                  >
                    <IconeWhatsapp className="size-4 shrink-0" aria-hidden />
                    Quero o {p.nome}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* O que vem em todos — senão o Essencial parece uma coluna de traços */}
      <Card className="mb-5">
        <h2 className="text-base font-semibold text-ink">
          Em todos os planos, sem exceção
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EM_TODOS.map((t) => (
            <li key={t} className="flex items-center gap-2 text-sm text-ink">
              <Check
                className="size-4 shrink-0 text-brand-mint"
                strokeWidth={2.4}
                aria-hidden
              />
              {t}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mb-5">
        <ClinicaPronta whatsapp={WHATSAPP_VENDAS} />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GARANTIAS.map((g) => (
          <div key={g.titulo} className="glass rounded-2xl p-4">
            <g.icone className="size-5 text-brand-mint" strokeWidth={1.9} aria-hidden />
            <p className="mt-2 text-sm font-semibold text-ink">{g.titulo}</p>
            <p className="mt-1 text-sm text-ink-muted">{g.texto}</p>
          </div>
        ))}
      </div>

      <Card>
        <h2 className="text-lg font-bold text-ink">Perguntas frequentes</h2>
        <div className="mt-3 divide-y divide-edge">
          {DUVIDAS.map((f) => (
            <div key={f.p} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-ink">{f.p}</p>
              <p className="mt-1 text-sm text-ink-muted">{f.r}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
