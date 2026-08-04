"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PAPEIS } from "@/lib/types";
import { Campo, Input, Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { novoUsuarioSchema, type NovoUsuarioValores } from "./schema";

/**
 * Formulário de novo usuário da equipe (react-hook-form + zod).
 * O botão fica desabilitado enquanto houver campo inválido e o servidor
 * revalida tudo com o mesmo schema (nunca confiar só no front).
 */
export function NovoUsuarioForm({
  action,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  erro?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<NovoUsuarioValores>({
    resolver: zodResolver(novoUsuarioSchema),
    mode: "onChange",
    defaultValues: { nome: "", email: "", senha: "", papel: "recepcao" },
  });

  async function aoEnviar(valores: NovoUsuarioValores) {
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
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <Campo rotulo="Nome" htmlFor="nome" obrigatorio erro={errors.nome?.message}>
        <Input id="nome" aria-invalid={!!errors.nome} {...register("nome")} />
      </Campo>

      <Campo rotulo="E-mail" htmlFor="email" obrigatorio erro={errors.email?.message}>
        <Input
          id="email"
          type="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Senha inicial"
          htmlFor="senha"
          obrigatorio
          dica="8+ caracteres, com letras e números."
          erro={errors.senha?.message}
        >
          <Input
            id="senha"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.senha}
            {...register("senha")}
          />
        </Campo>
        <Campo rotulo="Papel" htmlFor="papel" obrigatorio erro={errors.papel?.message}>
          <Select id="papel" aria-invalid={!!errors.papel} {...register("papel")}>
            {PAPEIS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!isValid || enviando}>
          {enviando ? "Criando…" : "Criar usuário"}
        </Button>
        <ButtonLink href="/configuracoes/usuarios" variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
