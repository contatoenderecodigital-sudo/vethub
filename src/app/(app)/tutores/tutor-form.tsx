"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Campo, Input } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { EnderecoCampos } from "@/components/endereco-campos";
import type { Tutor } from "@/lib/types";
import {
  enderecoDoBanco,
  mascaraCPF,
  mascaraTelefone,
  telefoneDoBanco,
  tutorSchema,
  type TutorFormValores,
} from "@/lib/validacao";
import { useEnvioComAviso } from "@/components/ui/envio-formulario";

/**
 * Formulário de tutor com validação em tempo real (react-hook-form + zod).
 * As máscaras cortam a digitação no limite; o botão Salvar fica
 * desabilitado enquanto houver campo inválido. O servidor revalida
 * tudo com o mesmo schema (nunca confiar só no front).
 */
export function TutorForm({
  action,
  tutor,
  cancelarHref,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  tutor?: Tutor;
  cancelarHref: string;
  erro?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const form = useForm<TutorFormValores>({
    resolver: zodResolver(tutorSchema),
    mode: "onChange",
    defaultValues: {
      nome: tutor?.nome ?? "",
      telefone: mascaraTelefone(telefoneDoBanco(tutor?.telefone)),
      cpf: mascaraCPF(tutor?.cpf ?? ""),
      email: tutor?.email ?? "",
      ...enderecoDoBanco(tutor ?? {}),
      consentimento_lgpd: tutor?.consentimento_lgpd ?? false,
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

  async function aoEnviar(valores: TutorFormValores) {
    setEnviando(true);
    try {
      const fd = new FormData();
      Object.entries(valores).forEach(([campo, valor]) =>
        fd.set(campo, typeof valor === "boolean" ? (valor ? "on" : "") : valor)
      );
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

        <Campo rotulo="Nome completo" htmlFor="nome" obrigatorio erro={errors.nome?.message}>
          <Input id="nome" {...register("nome")} aria-invalid={!!errors.nome} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Telefone (WhatsApp)"
            htmlFor="telefone"
            obrigatorio
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
          <Campo rotulo="CPF" htmlFor="cpf" dica="Opcional" erro={errors.cpf?.message}>
            <Input
              id="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              aria-invalid={!!errors.cpf}
              {...register("cpf", {
                onChange: (e) =>
                  setValue("cpf", mascaraCPF(e.target.value), {
                    shouldValidate: true,
                  }),
              })}
            />
          </Campo>
        </div>

        <Campo rotulo="E-mail" htmlFor="email" dica="Opcional" erro={errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="nome@exemplo.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Campo>

        <div className="border-t border-white/20 pt-4">
          <EnderecoCampos<TutorFormValores> />
        </div>

        <label className="flex items-start gap-2 rounded-lg border border-white/25 bg-white/10 p-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[#34D399]"
            {...register("consentimento_lgpd")}
          />
          <span>
            O tutor consentiu com o uso dos seus dados para cadastro e comunicação
            da clínica (LGPD).
          </span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={enviando}>
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
