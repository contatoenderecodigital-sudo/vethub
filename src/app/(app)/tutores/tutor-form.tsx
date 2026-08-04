"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Campo, Input } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Tutor } from "@/lib/types";
import {
  mascaraCPF,
  mascaraTelefone,
  telefoneDoBanco,
  tutorSchema,
  type TutorFormValores,
} from "@/lib/validacao";

/**
 * Formulário de tutor com validação em tempo real (react-hook-form + zod).
 * As máscaras cortam a digitação no limite de dígitos; o botão Salvar
 * fica desabilitado enquanto houver campo inválido. O servidor revalida
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<TutorFormValores>({
    resolver: zodResolver(tutorSchema),
    mode: "onChange",
    defaultValues: {
      nome: tutor?.nome ?? "",
      telefone: mascaraTelefone(telefoneDoBanco(tutor?.telefone)),
      cpf: mascaraCPF(tutor?.cpf ?? ""),
      email: tutor?.email ?? "",
      endereco: tutor?.endereco ?? "",
      consentimento_lgpd: tutor?.consentimento_lgpd ?? false,
    },
  });

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
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
      {erro && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
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
        <Campo
          rotulo="CPF"
          htmlFor="cpf"
          dica="Opcional"
          erro={errors.cpf?.message}
        >
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

      <Campo rotulo="Endereço" htmlFor="endereco" erro={errors.endereco?.message}>
        <Input id="endereco" {...register("endereco")} />
      </Campo>

      <label className="flex items-start gap-2 rounded-lg border border-edge bg-zinc-50 p-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[#059669]"
          {...register("consentimento_lgpd")}
        />
        <span>
          O tutor consentiu com o uso dos seus dados para cadastro e comunicação
          da clínica (LGPD).
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
  );
}
