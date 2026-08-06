"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Save } from "lucide-react";
import type { Clinica } from "@/lib/types";
import { Campo, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { EnderecoCampos } from "@/components/endereco-campos";
import { enderecoDoBanco, mascaraCNPJ, mascaraTelefone } from "@/lib/validacao";
import { clinicaSchema, type ClinicaFormValores } from "./schema";
import { useEnvioComAviso } from "@/components/ui/envio-formulario";

/**
 * Formulário dos dados da clínica (react-hook-form + zod).
 * As máscaras de CNPJ/telefone cortam a digitação no limite; o botão
 * Salvar fica desabilitado enquanto houver campo inválido e o servidor
 * revalida tudo com o mesmo schema.
 */
export function ClinicaForm({
  action,
  clinica,
  erro,
  ok,
}: {
  action: (formData: FormData) => Promise<void>;
  clinica: Clinica;
  erro?: string;
  ok?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const form = useForm<ClinicaFormValores>({
    resolver: zodResolver(clinicaSchema),
    mode: "onChange",
    defaultValues: {
      nome: clinica.nome,
      cnpj: mascaraCNPJ(clinica.cnpj ?? ""),
      // Telefone da clínica fica no banco só com dígitos, sem DDI.
      telefone: mascaraTelefone(clinica.telefone ?? ""),
      ...enderecoDoBanco(clinica),
    },
  });

  const {
    register,
    setValue,
    formState: { errors },
  } = form;


  // Botão sempre clicável: quem clica com erro recebe o resumo e é

  // levado ao primeiro campo, em vez de encarar um botão apagado.

  const { enviar, aviso } = useEnvioComAviso(form, aoEnviar);

  async function aoEnviar(valores: ClinicaFormValores) {
    setEnviando(true);
    try {
      const fd = new FormData();
      Object.entries(valores).forEach(([campo, valor]) => fd.set(campo, valor));
      await action(fd); // server action revalida com zod e redireciona
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FormProvider {...form}>
    <form onSubmit={enviar} className="space-y-4" noValidate>
        {aviso}
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}
      {ok && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-300/25 px-3 py-2 text-sm text-emerald-100">
          <Check className="size-4" />
          Dados salvos.
        </p>
      )}

      <Campo
        rotulo="Nome da clínica"
        htmlFor="nome"
        obrigatorio
        erro={errors.nome?.message}
      >
        <Input id="nome" aria-invalid={!!errors.nome} {...register("nome")} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="CNPJ" htmlFor="cnpj" erro={errors.cnpj?.message}>
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
        <Campo rotulo="Telefone" htmlFor="telefone" erro={errors.telefone?.message}>
          <Input
            id="telefone"
            type="tel"
            inputMode="numeric"
            placeholder="(11) 3333-4444"
            aria-invalid={!!errors.telefone}
            {...register("telefone", {
              onChange: (e) =>
                setValue("telefone", mascaraTelefone(e.target.value), {
                  shouldValidate: true,
                }),
            })}
          />
        </Campo>
      </div>

      <div className="border-t border-white/20 pt-4">
        <EnderecoCampos<ClinicaFormValores> />
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={enviando}>
          <Save className="size-4" />
          {enviando ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
    </FormProvider>
  );
}
