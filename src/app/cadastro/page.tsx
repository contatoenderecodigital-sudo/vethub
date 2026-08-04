"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";
import { cadastroSchema, type CadastroValores } from "./schema";

export default function CadastroPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CadastroValores>({
    resolver: zodResolver(cadastroSchema),
    mode: "onChange",
    defaultValues: { clinica: "", nome: "", email: "", senha: "" },
  });

  async function cadastrar(valores: CadastroValores) {
    setErro(null);
    setCarregando(true);

    const res = await fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });

    if (!res.ok) {
      const corpo = await res.json().catch(() => null);
      setErro(corpo?.erro ?? "Não foi possível concluir o cadastro. Tente novamente.");
      setCarregando(false);
      return;
    }

    // conta criada — entra direto
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: valores.email,
      password: valores.senha,
    });
    if (error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="bg-brand-gradient flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Wordmark sobre="escuro" className="mb-8 text-4xl" />

      <div className="glass-forte w-full max-w-sm rounded-3xl p-6 sm:p-8">
        <h1 className="text-lg font-semibold text-ink">Cadastre sua clínica</h1>
        <p className="mb-6 mt-1 text-sm text-ink-muted">
          Crie a conta de administrador e comece a usar em minutos.
        </p>

        <form onSubmit={handleSubmit(cadastrar)} className="space-y-4" noValidate>
          {erro && (
            <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
              {erro}
            </p>
          )}

          <Campo
            rotulo="Nome da clínica"
            htmlFor="clinica"
            obrigatorio
            erro={errors.clinica?.message}
          >
            <Input
              id="clinica"
              placeholder="Ex.: Clínica Vida Animal"
              aria-invalid={!!errors.clinica}
              {...register("clinica")}
            />
          </Campo>
          <Campo rotulo="Seu nome" htmlFor="nome" obrigatorio erro={errors.nome?.message}>
            <Input
              id="nome"
              autoComplete="name"
              aria-invalid={!!errors.nome}
              {...register("nome")}
            />
          </Campo>
          <Campo rotulo="E-mail" htmlFor="email" obrigatorio erro={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Campo>
          <Campo
            rotulo="Senha"
            htmlFor="senha"
            obrigatorio
            dica="Mínimo de 8 caracteres, com letras e números."
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

          <Button type="submit" className="w-full" disabled={!isValid || carregando}>
            {carregando ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand-mint hover:underline">
            Entrar
          </Link>
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-white/70">
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
