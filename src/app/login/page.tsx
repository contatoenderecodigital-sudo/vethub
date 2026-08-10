"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";
import { schemaEmailObrigatorio } from "@/lib/validacao";
import { useEnvioComAviso } from "@/components/ui/envio-formulario";

// Validação leve: só formato de e-mail e senha não vazia. Quem decide
// se as credenciais valem é o Supabase Auth.
const loginSchema = z.object({
  email: schemaEmailObrigatorio,
  senha: z.string().min(1, "Informe a senha."),
});

type LoginValores = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const form = useForm<LoginValores>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", senha: "" },
  });

  const {
    register,
    formState: { errors },
  } = form;

  // Botão sempre clicável: quem clica com erro recebe o resumo e é
  // levado ao primeiro campo, em vez de encarar um botão apagado.
  const { enviar, aviso } = useEnvioComAviso(form, entrar);

  async function entrar(valores: LoginValores) {
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: valores.email,
      password: valores.senha,
    });
    if (error) {
      setErro("E-mail ou senha inválidos.");
      setCarregando(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="bg-brand-gradient flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Wordmark sobre="auto" className="mb-8 text-4xl" />

      <div className="glass-forte w-full max-w-sm rounded-3xl p-6 sm:p-8">
        <h1 className="text-lg font-semibold text-ink">Entrar</h1>
        <p className="mb-6 mt-1 text-sm text-ink-muted">
          Acesse a central da sua clínica.
        </p>

        <form onSubmit={enviar} className="space-y-4" noValidate>
        {aviso}
          {erro && (
            <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
              {erro}
            </p>
          )}

          <Campo rotulo="E-mail" htmlFor="email" obrigatorio erro={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Campo>
          <Campo rotulo="Senha" htmlFor="senha" obrigatorio erro={errors.senha?.message}>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.senha}
              {...register("senha")}
            />
          </Campo>

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/esqueci-senha" className="link-vidro font-medium">
            Esqueci minha senha
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-ink-muted">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium link-vidro">
            Cadastre sua clínica
          </Link>
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-white">
        Agenda, prontuário, internação e estoque em um só lugar.
      </p>

      <p className="mt-3 text-center text-xs text-white/90">
        <Link href="/termos-de-uso" className="hover:text-white hover:underline">
          Termos de Uso
        </Link>
        {" · "}
        <Link
          href="/politica-de-privacidade"
          className="hover:text-white hover:underline"
        >
          Política de Privacidade
        </Link>
      </p>
    </main>
  );
}
