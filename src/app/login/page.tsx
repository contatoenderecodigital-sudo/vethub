"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
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
      <Wordmark sobre="escuro" className="mb-8 text-4xl" />

      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl sm:p-8">
        <h1 className="text-lg font-semibold text-ink">Entrar</h1>
        <p className="mb-6 mt-1 text-sm text-ink-muted">
          Acesse a central da sua clínica.
        </p>

        <form onSubmit={entrar} className="space-y-4">
          <Campo rotulo="E-mail" htmlFor="email" obrigatorio>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Campo>
          <Campo rotulo="Senha" htmlFor="senha" obrigatorio>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Campo>

          {erro && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-brand hover:underline">
            Cadastre sua clínica
          </Link>
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-white/80">
        Agenda, prontuário, internação e estoque em um só lugar.
      </p>
    </main>
  );
}
