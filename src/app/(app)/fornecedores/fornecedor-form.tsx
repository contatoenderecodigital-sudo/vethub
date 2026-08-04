"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Campo, Input, Textarea } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { EnderecoCampos } from "@/components/endereco-campos";
import { mascaraCNPJ, mascaraTelefone } from "@/lib/validacao";
import type { Fornecedor } from "@/lib/types";
import {
  fornecedorParaForm,
  fornecedorSchema,
  type FornecedorFormValores,
} from "./schema";

/**
 * Formulário de fornecedor com validação em tempo real (react-hook-form +
 * zod) e endereço com busca automática por CEP. As máscaras cortam a
 * digitação no limite; o servidor revalida tudo com o mesmo schema.
 */
export function FornecedorForm({
  action,
  fornecedor,
  cancelarHref,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  fornecedor?: Fornecedor;
  cancelarHref: string;
  erro?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const form = useForm<FornecedorFormValores>({
    resolver: zodResolver(fornecedorSchema),
    mode: "onChange",
    defaultValues: fornecedorParaForm(fornecedor),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = form;

  async function aoEnviar(valores: FornecedorFormValores) {
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
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
        {erro && (
          <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
        )}

        <Campo
          rotulo="Nome fantasia"
          htmlFor="nome"
          obrigatorio
          erro={errors.nome?.message}
        >
          <Input id="nome" {...register("nome")} aria-invalid={!!errors.nome} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Razão social"
            htmlFor="razao_social"
            dica="Opcional"
            erro={errors.razao_social?.message}
          >
            <Input
              id="razao_social"
              aria-invalid={!!errors.razao_social}
              {...register("razao_social")}
            />
          </Campo>
          <Campo rotulo="CNPJ" htmlFor="cnpj" dica="Opcional" erro={errors.cnpj?.message}>
            <Input
              id="cnpj"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              aria-invalid={!!errors.cnpj}
              {...register("cnpj", {
                onChange: (e) =>
                  setValue("cnpj", mascaraCNPJ(e.target.value), {
                    shouldValidate: true,
                  }),
              })}
            />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Telefone"
            htmlFor="telefone"
            dica="Opcional"
            erro={errors.telefone?.message}
          >
            <Input
              id="telefone"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              aria-invalid={!!errors.telefone}
              {...register("telefone", {
                onChange: (e) =>
                  setValue("telefone", mascaraTelefone(e.target.value), {
                    shouldValidate: true,
                  }),
              })}
            />
          </Campo>
          <Campo
            rotulo="E-mail"
            htmlFor="email"
            dica="Opcional"
            erro={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              placeholder="contato@exemplo.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Campo>
        </div>

        <Campo
          rotulo="Pessoa de contato"
          htmlFor="contato"
          dica="Quem atende a clínica nesse fornecedor"
          erro={errors.contato?.message}
        >
          <Input id="contato" aria-invalid={!!errors.contato} {...register("contato")} />
        </Campo>

        <div className="border-t border-white/20 pt-4">
          <EnderecoCampos<FornecedorFormValores> />
        </div>

        <Campo
          rotulo="Observação"
          htmlFor="observacao"
          dica="Prazo de entrega, condição de pagamento, pedido mínimo…"
          erro={errors.observacao?.message}
        >
          <Textarea
            id="observacao"
            aria-invalid={!!errors.observacao}
            {...register("observacao")}
          />
        </Campo>

        <label className="flex items-start gap-2 rounded-lg border border-white/25 bg-white/10 p-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[#34D399]"
            {...register("ativo")}
          />
          <span>
            Fornecedor ativo — aparece na lista de seleção ao lançar uma compra.
          </span>
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
    </FormProvider>
  );
}
