"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Barcode,
  CircleCheck,
  Minus,
  Plus,
  Receipt,
  ShoppingCart,
  TriangleAlert,
  X,
} from "lucide-react";
import { formatBRL, formatDataISO } from "@/lib/format";
import {
  FORMAS_PAGAMENTO_VENDA,
  FORMAS_PARCELAVEIS,
  type FormaPagamentoVenda,
  type ItemVenda,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { carregarItemPorCodigo, carregarItemPorId, finalizarVenda } from "./actions";
import {
  mascaraMoeda,
  numeroOuZero,
  textoMoeda,
  textoQuantidade,
} from "./numeros";

const PARCELAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface Linha {
  chave: string;
  item_id: string | null;
  descricao: string;
  quantidade: string;
  valor_unitario: string;
  desconto: string;
  controla_estoque: boolean;
  estoque_atual: number;
}

/** Só os campos de texto da linha são editáveis direto na tela. */
type CampoLinha = "quantidade" | "valor_unitario" | "desconto";

interface LinhaPagamento {
  chave: string;
  forma: FormaPagamentoVenda;
  valor: string;
  parcelas: string;
}

interface Concluida {
  id: string;
  numero: number;
  troco: number;
  fiado: number;
  vencimentoFiado: string;
}

function novaChave() {
  return crypto.randomUUID();
}

/**
 * Terminal de venda rápida. Todo o cálculo daqui é para a TELA. Quem manda
 * nos totais é o servidor, que recalcula tudo em finalizarVenda a partir dos
 * itens e do catálogo.
 */
export function PdvTerminal({
  vendedor,
  inicio,
}: {
  vendedor: string;
  /**
   * Venda que já chega começada.
   *
   * Serve a duas origens, e por isso não se chama mais `orcamento`: o
   * orçamento aprovado (antes, aprovar não levava a lugar nenhum e era
   * preciso redigitar item por item, o que na prática significava que
   * ninguém usava o módulo) e a consulta atendida que a recepção vai cobrar
   * pelo Balcão.
   */
  inicio?: {
    tutor: OpcaoBusca | null;
    itens: {
      item_id: string | null;
      descricao: string;
      quantidade: number;
      valor_unitario: number;
    }[];
  };
}) {
  const router = useRouter();

  const [linhas, setLinhas] = useState<Linha[]>(() =>
    (inicio?.itens ?? []).map((i) => ({
      chave: crypto.randomUUID(),
      item_id: i.item_id,
      descricao: i.descricao,
      quantidade: textoQuantidade(i.quantidade),
      valor_unitario: textoMoeda(i.valor_unitario),
      desconto: "",
      controla_estoque: false,
      estoque_atual: 0,
    }))
  );
  const [descontoGeral, setDescontoGeral] = useState("");
  const [tutor, setTutor] = useState<OpcaoBusca | null>(inicio?.tutor ?? null);
  const [codigo, setCodigo] = useState("");
  const [chaveBusca, setChaveBusca] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  const [painel, setPainel] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [pagamentos, setPagamentos] = useState<LinhaPagamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<Concluida | null>(null);

  const [buscando, iniciarBusca] = useTransition();
  const [gravando, iniciarGravacao] = useTransition();

  // ---------------- carrinho ----------------

  const totalDaLinha = (l: Linha) =>
    Math.max(
      numeroOuZero(l.quantidade) * numeroOuZero(l.valor_unitario) -
        numeroOuZero(l.desconto),
      0
    );

  const subtotal = linhas.reduce((soma, l) => soma + totalDaLinha(l), 0);
  const desconto = Math.min(numeroOuZero(descontoGeral), subtotal);
  const total = Math.max(subtotal - desconto, 0);

  function adicionar(item: ItemVenda) {
    setAviso(null);
    setLinhas((atual) => {
      const existente = atual.find((l) => l.item_id === item.id);
      if (existente) {
        return atual.map((l) =>
          l.chave === existente.chave
            ? {
                ...l,
                quantidade: textoQuantidade(numeroOuZero(l.quantidade) + 1),
              }
            : l
        );
      }
      return [
        ...atual,
        {
          chave: novaChave(),
          item_id: item.id,
          descricao: item.nome,
          quantidade: "1",
          valor_unitario: textoMoeda(Number(item.preco_venda)),
          desconto: "",
          controla_estoque: item.controla_estoque,
          estoque_atual: Number(item.estoque_atual),
        },
      ];
    });
  }

  function escolherDoCombobox(opcao: OpcaoBusca | null) {
    if (!opcao) return;
    setChaveBusca((k) => k + 1); // remonta o combobox = campo limpo p/ o próximo
    iniciarBusca(async () => {
      const item = await carregarItemPorId(opcao.id);
      if (!item) setAviso("Item não encontrado no catálogo.");
      else adicionar(item);
    });
  }

  function lerCodigo() {
    const termo = codigo.trim();
    if (!termo) return;
    setCodigo("");
    iniciarBusca(async () => {
      const item = await carregarItemPorCodigo(termo);
      if (!item) setAviso(`Nenhum item com o código "${termo}".`);
      else adicionar(item);
    });
  }

  function alterar(chave: string, campo: CampoLinha, valor: string) {
    setLinhas((atual) =>
      atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l))
    );
  }

  function somarQuantidade(chave: string, passo: number) {
    setLinhas((atual) =>
      atual.map((l) =>
        l.chave === chave
          ? {
              ...l,
              quantidade: textoQuantidade(
                Math.max(numeroOuZero(l.quantidade) + passo, 1)
              ),
            }
          : l
      )
    );
  }

  function remover(chave: string) {
    setLinhas((atual) => atual.filter((l) => l.chave !== chave));
  }

  // ---------------- pagamento ----------------

  const pago = pagamentos.reduce((soma, p) => soma + numeroOuZero(p.valor), 0);
  const falta = Math.max(total - pago, 0);
  const excedente = Math.max(pago - total, 0);
  const temDinheiro = pagamentos.some(
    (p) => p.forma === "dinheiro" && numeroOuZero(p.valor) > 0
  );
  const totalFiado = pagamentos
    .filter((p) => p.forma === "fiado")
    .reduce((soma, p) => soma + numeroOuZero(p.valor), 0);
  const fiadoSemTutor = totalFiado > 0 && !tutor;

  function abrirPainel() {
    if (linhas.length === 0) return;
    setErro(null);
    setPagamentos([
      { chave: novaChave(), forma: "dinheiro", valor: textoMoeda(total), parcelas: "1" },
    ]);
    setPainel(true);
  }

  function alterarPagamento(
    chave: string,
    mudanca: Partial<Omit<LinhaPagamento, "chave">>
  ) {
    setPagamentos((atual) =>
      atual.map((p) => (p.chave === chave ? { ...p, ...mudanca } : p))
    );
  }

  function adicionarPagamento() {
    setPagamentos((atual) => [
      ...atual,
      {
        chave: novaChave(),
        forma: "pix",
        valor: textoMoeda(Math.max(total - pago, 0)),
        parcelas: "1",
      },
    ]);
  }

  function concluir() {
    setErro(null);

    if (linhas.length === 0) return setErro("Adicione ao menos um item.");
    if (falta > 0.004) {
      return setErro(`Ainda faltam ${formatBRL(falta)} para fechar a venda.`);
    }
    if (excedente > 0.004 && !temDinheiro) {
      return setErro("Os pagamentos somam mais que o total. Só o dinheiro gera troco.");
    }
    if (fiadoSemTutor) {
      return setErro("Escolha o tutor para lançar a venda no fiado.");
    }

    const payload = JSON.stringify({
      tutor_id: tutor?.id ?? null,
      desconto: numeroOuZero(descontoGeral),
      observacao,
      itens: linhas.map((l) => ({
        item_id: l.item_id,
        descricao: l.descricao,
        quantidade: numeroOuZero(l.quantidade),
        valor_unitario: numeroOuZero(l.valor_unitario),
        desconto: numeroOuZero(l.desconto),
      })),
      pagamentos: pagamentos
        .filter((p) => numeroOuZero(p.valor) > 0)
        .map((p) => ({
          forma: p.forma,
          valor: numeroOuZero(p.valor),
          parcelas: Number(p.parcelas) || 1,
        })),
    });

    iniciarGravacao(async () => {
      const resposta = await finalizarVenda(payload);
      if ("erro" in resposta) {
        setErro(resposta.erro);
        return;
      }
      setPainel(false);
      setConcluida(resposta);
      router.refresh();
    });
  }

  function novaVenda() {
    setLinhas([]);
    setDescontoGeral("");
    setTutor(null);
    setCodigo("");
    setObservacao("");
    setPagamentos([]);
    setConcluida(null);
    setErro(null);
    setAviso(null);
    setChaveBusca((k) => k + 1);
  }

  // ---------------- confirmação ----------------

  if (concluida) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-300/30 text-emerald-50">
          <CircleCheck className="size-8" strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-bold text-ink">
          Venda nº {concluida.numero} registrada
        </h2>
        {/* Dizer "pagamento recebido por completo" numa venda fiada é mentir
            para quem operou o caixa: não entrou nada. A mensagem tem que
            contar o que de fato aconteceu com o dinheiro. */}
        <p className="mt-1 text-sm text-ink-muted">
          {concluida.fiado > 0
            ? `${formatBRL(concluida.fiado)} no fiado, com vencimento em ${formatDataISO(concluida.vencimentoFiado)}.`
            : concluida.troco > 0
              ? `Troco de ${formatBRL(concluida.troco)}.`
              : "Pagamento recebido por completo."}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={novaVenda}>
            <Plus className="size-4" />
            Nova venda
          </Button>
          <Link
            href={`/vendas/${concluida.id}/comprovante`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/40 lg:h-10 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <Receipt className="size-4" />
            Ver comprovante
          </Link>
        </div>
        <Link
          href={`/vendas/${concluida.id}`}
          className="mt-3 inline-block text-sm font-medium link-vidro"
        >
          Abrir os detalhes da venda
        </Link>
      </div>
    );
  }

  // ---------------- terminal ----------------

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* ---------- coluna esquerda: itens ---------- */}
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
            <Campo rotulo="Buscar item" htmlFor="pdv-busca-item">
              <BuscaCombobox
                key={chaveBusca}
                id="pdv-busca-item"
                name="item_id"
                endpoint="/api/busca/itens"
                placeholder="Nome, código ou serviço…"
                aoSelecionar={escolherDoCombobox}
              />
            </Campo>

            <Campo rotulo="Código de barras" htmlFor="pdv-codigo">
              <div className="relative">
                <Barcode
                  className="pointer-events-none absolute left-3 top-3 size-4 text-ink-muted"
                  aria-hidden
                />
                <Input
                  id="pdv-codigo"
                  className="pl-9"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Bipe e tecle Enter"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      lerCodigo();
                    }
                  }}
                />
              </div>
            </Campo>
          </div>

          {buscando && (
            <p className="mt-2 text-xs text-ink-muted">Buscando item…</p>
          )}
          {aviso && (
            <p
              role="alert"
              className="mt-2 rounded-lg border border-amber-200/40 bg-amber-300/25 px-3 py-2 text-sm font-medium text-amber-50"
            >
              {aviso}
            </p>
          )}

          <div className="mt-4 border-t border-white/20 pt-4">
            {linhas.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/35 px-4 py-10 text-center">
                <ShoppingCart
                  className="mb-2 size-8 text-ink-muted"
                  strokeWidth={1.6}
                  aria-hidden
                />
                <p className="text-sm font-medium text-ink">Carrinho vazio</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Busque um item ou bipe o código de barras para começar.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {linhas.map((l) => {
                  const qtd = numeroOuZero(l.quantidade);
                  const semEstoque =
                    l.controla_estoque && qtd > l.estoque_atual;

                  return (
                    <li
                      key={l.chave}
                      className="rounded-xl border border-edge bg-white/10 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {l.descricao}
                          </p>
                          {l.controla_estoque && (
                            <p
                              className={`text-xs ${
                                semEstoque ? "text-amber-100" : "text-ink-muted"
                              }`}
                            >
                              Estoque: {textoQuantidade(l.estoque_atual)}
                              {semEstoque && " · quantidade acima do disponível"}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-ink tabular-nums">
                            {formatBRL(totalDaLinha(l))}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remover ${l.descricao}`}
                            title="Remover item"
                            onClick={() => remover(l.chave)}
                            className="flex size-11 shrink-0 cursor-pointer lg:size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-red-400/25 hover:text-red-100"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr_1fr]">
                        <div>
                          <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                            Quantidade
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="Diminuir quantidade"
                              onClick={() => somarQuantidade(l.chave, -1)}
                              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/30 bg-white/15 text-white transition-colors hover:bg-white/25"
                            >
                              <Minus className="size-4" />
                            </button>
                            <Input
                              aria-label={`Quantidade de ${l.descricao}`}
                              inputMode="decimal"
                              className="text-center"
                              value={l.quantidade}
                              onChange={(e) =>
                                alterar(
                                  l.chave,
                                  "quantidade",
                                  e.target.value.replace(/[^\d.,]/g, "").slice(0, 6)
                                )
                              }
                            />
                            <button
                              type="button"
                              aria-label="Aumentar quantidade"
                              onClick={() => somarQuantidade(l.chave, 1)}
                              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/30 bg-white/15 text-white transition-colors hover:bg-white/25"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                            Valor unit. (R$)
                          </span>
                          <Input
                            aria-label={`Valor unitário de ${l.descricao}`}
                            inputMode="decimal"
                            placeholder="0,00"
                            value={l.valor_unitario}
                            onChange={(e) =>
                              alterar(
                                l.chave,
                                "valor_unitario",
                                mascaraMoeda(e.target.value)
                              )
                            }
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                            Desconto (R$)
                          </span>
                          <Input
                            aria-label={`Desconto de ${l.descricao}`}
                            inputMode="decimal"
                            placeholder="0,00"
                            value={l.desconto}
                            onChange={(e) =>
                              alterar(l.chave, "desconto", mascaraMoeda(e.target.value))
                            }
                          />
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ---------- coluna direita: resumo ---------- */}
        <aside className="glass rounded-2xl p-4 sm:p-5 lg:sticky lg:top-[4.75rem]">
          <h2 className="text-base font-semibold text-ink">Resumo</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Vendedor: {vendedor}</p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Itens</dt>
              <dd className="font-medium text-ink tabular-nums">{linhas.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatBRL(subtotal)}
              </dd>
            </div>
          </dl>

          <div className="mt-3">
            <Campo rotulo="Desconto geral (R$)" htmlFor="pdv-desconto">
              <Input
                id="pdv-desconto"
                inputMode="decimal"
                placeholder="0,00"
                autoComplete="off"
                value={descontoGeral}
                onChange={(e) => setDescontoGeral(mascaraMoeda(e.target.value))}
              />
            </Campo>
          </div>

          <div className="mt-4 rounded-xl bg-white/15 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Total
            </p>
            <p className="text-3xl font-bold text-ink tabular-nums">
              {formatBRL(total)}
            </p>
          </div>

          <div className="mt-4">
            <Campo
              rotulo="Tutor"
              htmlFor="pdv-tutor"
              dica="Deixe em branco para venda avulsa."
            >
              {/* `valorInicial` é o que faz o nome APARECER no campo. Sem
                  ele o tutor ficava só no estado: a venda saía certa, mas a
                  recepção via um campo vazio e procurava o mesmo tutor de
                  novo — perdendo justamente o passo que o Balcão adiantou. */}
              <BuscaCombobox
                id="pdv-tutor"
                name="tutor_id"
                endpoint="/api/busca/tutores"
                placeholder="Buscar tutor…"
                valorInicial={inicio?.tutor ?? undefined}
                aoSelecionar={setTutor}
              />
            </Campo>
          </div>

          <Button
            type="button"
            className="mt-4 w-full"
            tamanho="lg"
            disabled={linhas.length === 0 || total <= 0}
            onClick={abrirPainel}
          >
            <Receipt className="size-4" />
            Finalizar venda
          </Button>
        </aside>
      </div>

      {/* ---------- painel de pagamento ---------- */}
      {painel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pagamento da venda"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div className="glass-menu max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-4 sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">Pagamento</h2>
                <p className="text-sm text-ink-muted">
                  Total da venda: {formatBRL(total)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar pagamento"
                onClick={() => setPainel(false)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <ul className="space-y-2">
              {pagamentos.map((p) => (
                <li
                  key={p.chave}
                  className="rounded-xl border border-edge bg-white/10 p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                        Forma
                      </span>
                      <Select
                        aria-label="Forma de pagamento"
                        value={p.forma}
                        onChange={(e) =>
                          alterarPagamento(p.chave, {
                            forma: e.target.value as FormaPagamentoVenda,
                          })
                        }
                      >
                        {FORMAS_PAGAMENTO_VENDA.map((f) => (
                          <option key={f.valor} value={f.valor}>
                            {f.rotulo}
                          </option>
                        ))}
                      </Select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                        Valor (R$)
                      </span>
                      <Input
                        aria-label="Valor do pagamento"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={p.valor}
                        onChange={(e) =>
                          alterarPagamento(p.chave, {
                            valor: mascaraMoeda(e.target.value),
                          })
                        }
                      />
                    </label>

                    {FORMAS_PARCELAVEIS.includes(p.forma) && (
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                          Parcelas
                        </span>
                        <Select
                          aria-label="Parcelas"
                          value={p.parcelas}
                          onChange={(e) =>
                            alterarPagamento(p.chave, { parcelas: e.target.value })
                          }
                        >
                          {PARCELAS.map((n) => (
                            <option key={n} value={String(n)}>
                              {n}x{" "}
                              {n > 1 && numeroOuZero(p.valor) > 0
                                ? `de ${formatBRL(numeroOuZero(p.valor) / n)}`
                                : "à vista"}
                            </option>
                          ))}
                        </Select>
                      </label>
                    )}
                  </div>

                  {pagamentos.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPagamentos((atual) =>
                          atual.filter((x) => x.chave !== p.chave)
                        )
                      }
                      className="mt-2 cursor-pointer text-xs font-medium text-ink-muted hover:text-red-100"
                    >
                      Remover forma
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variante="secondary"
              tamanho="sm"
              className="mt-2"
              onClick={adicionarPagamento}
            >
              <Plus className="size-4" />
              Outra forma
            </Button>

            <dl className="mt-4 space-y-1.5 border-t border-white/20 pt-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Pago</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatBRL(pago)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-ink">
                  {falta > 0 ? "Falta" : "Troco"}
                </dt>
                <dd
                  className={`text-lg font-bold tabular-nums ${
                    falta > 0 ? "text-amber-100" : "text-emerald-50"
                  }`}
                >
                  {formatBRL(falta > 0 ? falta : excedente)}
                </dd>
              </div>
            </dl>

            {excedente > 0.004 && !temDinheiro && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200/40 bg-amber-300/25 px-3 py-2 text-sm font-medium text-amber-50">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                Só o dinheiro gera troco. Ajuste os valores das outras formas.
              </p>
            )}

            {fiadoSemTutor && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200/40 bg-amber-300/25 px-3 py-2 text-sm font-medium text-amber-50">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                Fiado exige um tutor selecionado no resumo. É ele quem fica
                devendo.
              </p>
            )}

            {totalFiado > 0 && tutor && (
              <p className="mt-3 rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm text-ink">
                {formatBRL(totalFiado)} vão para o extrato de {tutor.rotulo} e
                para as contas a receber, com vencimento em 30 dias.
              </p>
            )}

            <div className="mt-4">
              <Campo rotulo="Observação" htmlFor="pdv-observacao">
                <Textarea
                  id="pdv-observacao"
                  maxLength={500}
                  className="min-h-16"
                  placeholder="Opcional. Aparece no comprovante interno."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </Campo>
            </div>

            {erro && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50"
              >
                {erro}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                tamanho="lg"
                className="flex-1"
                disabled={gravando}
                onClick={concluir}
              >
                {gravando ? "Gravando…" : "Concluir venda"}
              </Button>
              <Button
                type="button"
                variante="ghost"
                tamanho="lg"
                disabled={gravando}
                onClick={() => setPainel(false)}
              >
                Voltar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
