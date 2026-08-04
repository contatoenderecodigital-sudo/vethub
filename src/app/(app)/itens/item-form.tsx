"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { TIPOS_ITEM, type Item } from "@/lib/types";
import {
  mascaraMoeda,
  moedaDoBanco,
  sanitizarInteiro,
  sanitizarNumero,
} from "./formato";
import { itemSchema, type ItemFormValores } from "./schema";

export interface OpcaoSimples {
  id: string;
  nome: string;
  /** Sigla da unidade / nome do grupo pai — mostrado entre parênteses. */
  detalhe?: string | null;
}

const CAIXA =
  "flex items-start gap-2 rounded-lg border border-white/25 bg-white/10 p-3 text-sm text-ink-muted";

/**
 * Formulário de item (criar/editar). Os campos mudam conforme o tipo:
 * produto mostra estoque e dados clínicos; serviço mostra a duração.
 * O servidor revalida tudo com o mesmo schema zod.
 */
export function ItemForm({
  action,
  item,
  grupos,
  marcas,
  unidades,
  cancelarHref,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  item?: Item;
  grupos: OpcaoSimples[];
  marcas: OpcaoSimples[];
  unidades: OpcaoSimples[];
  cancelarHref: string;
  erro?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isValid },
  } = useForm<ItemFormValores>({
    resolver: zodResolver(itemSchema),
    mode: "onChange",
    defaultValues: {
      tipo: item?.tipo ?? "produto",
      nome: item?.nome ?? "",
      codigo: item?.codigo ?? "",
      codigo_barras: item?.codigo_barras ?? "",
      descricao: item?.descricao ?? "",
      grupo_id: item?.grupo_id ?? "",
      marca_id: item?.marca_id ?? "",
      unidade_id: item?.unidade_id ?? "",
      preco_venda: moedaDoBanco(item?.preco_venda),
      preco_custo: moedaDoBanco(item?.preco_custo),
      comissao_percentual:
        item?.comissao_percentual != null
          ? String(item.comissao_percentual).replace(".", ",")
          : "",
      controla_estoque: item?.controla_estoque ?? false,
      estoque_minimo:
        item?.estoque_minimo != null && Number(item.estoque_minimo) > 0
          ? String(item.estoque_minimo).replace(".", ",")
          : "",
      medicamento: item?.medicamento ?? false,
      principio_ativo: item?.principio_ativo ?? "",
      requer_receita: item?.requer_receita ?? false,
      vacina: item?.vacina ?? false,
      duracao_minutos:
        item?.duracao_minutos != null ? String(item.duracao_minutos) : "",
      ativo: item?.ativo ?? true,
    },
  });

  // useWatch (e não watch()) para o React Compiler conseguir otimizar o form
  const tipo = useWatch({ control, name: "tipo" });
  const controlaEstoque = useWatch({ control, name: "controla_estoque" });
  const ehProduto = tipo === "produto";
  const ehServico = tipo === "servico";

  async function aoEnviar(valores: ItemFormValores) {
    setEnviando(true);
    try {
      const fd = new FormData();
      Object.entries(valores).forEach(([campo, valor]) =>
        fd.set(campo, typeof valor === "boolean" ? (valor ? "on" : "") : valor)
      );
      await action(fd); // a server action revalida com zod e redireciona
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tipo" htmlFor="tipo" obrigatorio erro={errors.tipo?.message}>
          <Select id="tipo" aria-invalid={!!errors.tipo} {...register("tipo")}>
            {TIPOS_ITEM.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
            {item?.tipo === "plano" && <option value="plano">Plano</option>}
          </Select>
        </Campo>

        <Campo rotulo="Nome" htmlFor="nome" obrigatorio erro={errors.nome?.message}>
          <Input id="nome" aria-invalid={!!errors.nome} {...register("nome")} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Código"
          htmlFor="codigo"
          dica="Código interno ou SKU usado pela clínica"
          erro={errors.codigo?.message}
        >
          <Input id="codigo" {...register("codigo")} />
        </Campo>
        <Campo
          rotulo="Código de barras"
          htmlFor="codigo_barras"
          erro={errors.codigo_barras?.message}
        >
          <Input id="codigo_barras" inputMode="numeric" {...register("codigo_barras")} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Grupo" htmlFor="grupo_id" erro={errors.grupo_id?.message}>
          <Select id="grupo_id" {...register("grupo_id")}>
            <option value="">Sem grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.detalhe ? `${g.detalhe} › ${g.nome}` : g.nome}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Marca" htmlFor="marca_id" erro={errors.marca_id?.message}>
          <Select id="marca_id" {...register("marca_id")}>
            <option value="">Sem marca</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo
          rotulo="Unidade"
          htmlFor="unidade_id"
          erro={errors.unidade_id?.message}
        >
          <Select id="unidade_id" {...register("unidade_id")}>
            <option value="">Não informada</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.detalhe ? `${u.nome} (${u.detalhe})` : u.nome}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          rotulo="Preço de venda (R$)"
          htmlFor="preco_venda"
          erro={errors.preco_venda?.message}
        >
          <Input
            id="preco_venda"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            aria-invalid={!!errors.preco_venda}
            {...register("preco_venda", {
              onChange: (e) =>
                setValue("preco_venda", mascaraMoeda(e.target.value), {
                  shouldValidate: true,
                }),
            })}
          />
        </Campo>
        <Campo
          rotulo="Preço de custo (R$)"
          htmlFor="preco_custo"
          erro={errors.preco_custo?.message}
        >
          <Input
            id="preco_custo"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            aria-invalid={!!errors.preco_custo}
            {...register("preco_custo", {
              onChange: (e) =>
                setValue("preco_custo", mascaraMoeda(e.target.value), {
                  shouldValidate: true,
                }),
            })}
          />
        </Campo>
        <Campo
          rotulo="Comissão (%)"
          htmlFor="comissao_percentual"
          dica="De 0 a 100"
          erro={errors.comissao_percentual?.message}
        >
          <Input
            id="comissao_percentual"
            inputMode="decimal"
            placeholder="0"
            autoComplete="off"
            aria-invalid={!!errors.comissao_percentual}
            {...register("comissao_percentual", {
              onChange: (e) =>
                setValue("comissao_percentual", sanitizarNumero(e.target.value, 6), {
                  shouldValidate: true,
                }),
            })}
          />
        </Campo>
      </div>

      {ehProduto && (
        <div className="space-y-4 rounded-xl border border-edge bg-white/10 p-3 sm:p-4">
          <p className="text-sm font-semibold text-ink">Estoque</p>

          <label className={CAIXA}>
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[#34D399]"
              {...register("controla_estoque")}
            />
            <span>
              Controlar o estoque deste produto (entradas, saídas e aviso de
              estoque mínimo).
            </span>
          </label>

          {controlaEstoque && (
            <Campo
              rotulo="Estoque mínimo"
              htmlFor="estoque_minimo"
              dica="Quando o saldo chegar nesse número, o item aparece em vermelho."
              erro={errors.estoque_minimo?.message}
              className="sm:max-w-xs"
            >
              <Input
                id="estoque_minimo"
                inputMode="decimal"
                placeholder="0"
                autoComplete="off"
                aria-invalid={!!errors.estoque_minimo}
                {...register("estoque_minimo", {
                  onChange: (e) =>
                    setValue("estoque_minimo", sanitizarNumero(e.target.value, 10), {
                      shouldValidate: true,
                    }),
                })}
              />
            </Campo>
          )}

          <p className="text-xs text-ink-muted">
            O saldo atual não é editado aqui — ele vem das movimentações
            registradas em Estoque.
          </p>
        </div>
      )}

      {ehProduto && (
        <div className="space-y-3 rounded-xl border border-edge bg-white/10 p-3 sm:p-4">
          <p className="text-sm font-semibold text-ink">Dados clínicos</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className={CAIXA}>
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[#34D399]"
                {...register("medicamento")}
              />
              <span>É medicamento</span>
            </label>
            <label className={CAIXA}>
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[#34D399]"
                {...register("requer_receita")}
              />
              <span>Exige receita</span>
            </label>
            <label className={CAIXA}>
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[#34D399]"
                {...register("vacina")}
              />
              <span>É vacina</span>
            </label>
          </div>

          <Campo
            rotulo="Princípio ativo"
            htmlFor="principio_ativo"
            dica="Ex.: Meloxicam 2 mg/mL"
            erro={errors.principio_ativo?.message}
          >
            <Input id="principio_ativo" {...register("principio_ativo")} />
          </Campo>
        </div>
      )}

      {ehServico && (
        <Campo
          rotulo="Duração (minutos)"
          htmlFor="duracao_minutos"
          dica="Tempo médio do serviço, usado para montar a agenda."
          erro={errors.duracao_minutos?.message}
          className="sm:max-w-xs"
        >
          <Input
            id="duracao_minutos"
            inputMode="numeric"
            placeholder="Ex.: 30"
            autoComplete="off"
            aria-invalid={!!errors.duracao_minutos}
            {...register("duracao_minutos", {
              onChange: (e) =>
                setValue("duracao_minutos", sanitizarInteiro(e.target.value, 4), {
                  shouldValidate: true,
                }),
            })}
          />
        </Campo>
      )}

      <Campo rotulo="Descrição" htmlFor="descricao" erro={errors.descricao?.message}>
        <Textarea
          id="descricao"
          className="min-h-20"
          placeholder="Detalhes que ajudam a equipe na hora de vender ou aplicar."
          {...register("descricao")}
        />
      </Campo>

      <label className={CAIXA}>
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[#34D399]"
          {...register("ativo")}
        />
        <span>Item ativo (aparece nas buscas e nas vendas).</span>
      </label>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!isValid || enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </Button>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
