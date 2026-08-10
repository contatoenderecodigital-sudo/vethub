"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { schemaSenhaForte } from "@/lib/validacao";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";

/**
 * Trocar a própria senha, já estando dentro do sistema.
 *
 * Pede a senha ATUAL antes de aceitar a nova. O Supabase não exige isso — mas
 * sem exigir, um computador destravado no balcão da recepção vira uma conta
 * sequestrada em dez segundos por qualquer um que passe. A conferência é
 * feita tentando entrar com ela, que é a única forma de verificar sem manter
 * uma cópia da senha em lugar nenhum.
 */
const schema = z
  .object({
    atual: z.string().min(1, "Informe a senha atual."),
    senha: schemaSenhaForte,
    confirmacao: z.string(),
  })
  .refine((v) => v.senha === v.confirmacao, {
    message: "As senhas não são iguais.",
    path: ["confirmacao"],
  })
  .refine((v) => v.senha !== v.atual, {
    message: "A nova senha precisa ser diferente da atual.",
    path: ["senha"],
  });

type Valores = z.infer<typeof schema>;

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(schema) });

  async function salvar(valores: Valores) {
    setErro(null);
    setOk(false);
    setCarregando(true);

    const supabase = createClient();
    const { data: sessao } = await supabase.auth.getUser();
    const email = sessao.user?.email;
    if (!email) {
      setErro("Sua sessão expirou. Entre de novo.");
      setCarregando(false);
      return;
    }

    const { error: erroAtual } = await supabase.auth.signInWithPassword({
      email,
      password: valores.atual,
    });
    if (erroAtual) {
      setErro("A senha atual está errada.");
      setCarregando(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: valores.senha });
    if (error) {
      setErro("Não foi possível trocar a senha. Tente de novo.");
      setCarregando(false);
      return;
    }

    reset();
    setOk(true);
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Trocar senha</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Vale só para a sua conta. Cada pessoa da equipe troca a dela.
        </p>
      </div>

      <Card>
        {ok && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-300/25 px-3 py-2 text-sm font-medium text-ink">
            <KeyRound className="size-4 shrink-0" aria-hidden />
            Senha trocada. Use a nova da próxima vez que entrar.
          </p>
        )}

        {erro && (
          <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
            {erro}
          </p>
        )}

        <form onSubmit={handleSubmit(salvar)} className="space-y-4" noValidate>
          <Campo rotulo="Senha atual" htmlFor="atual" obrigatorio erro={errors.atual?.message}>
            <Input
              id="atual"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.atual}
              {...register("atual")}
            />
          </Campo>

          <Campo rotulo="Nova senha" htmlFor="senha" obrigatorio erro={errors.senha?.message}>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.senha}
              {...register("senha")}
            />
          </Campo>

          <Campo
            rotulo="Repita a nova senha"
            htmlFor="confirmacao"
            obrigatorio
            erro={errors.confirmacao?.message}
          >
            <Input
              id="confirmacao"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmacao}
              {...register("confirmacao")}
            />
          </Campo>

          <Button type="submit" disabled={carregando}>
            {carregando ? "Salvando…" : "Trocar senha"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
