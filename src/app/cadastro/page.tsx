"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";

export default function CadastroPage() {
  const router = useRouter();
  const [clinica, setClinica] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    // Senha forte obrigatória
    if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
      setErro("A senha precisa ter no mínimo 8 caracteres, com letras e números.");
      return;
    }

    setCarregando(true);
    const res = await fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinica, nome, email, senha }),
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
      email,
      password: senha,
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

      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl sm:p-8">
        <h1 className="text-lg font-semibold text-ink">Cadastre sua clínica</h1>
        <p className="mb-6 mt-1 text-sm text-ink-muted">
          Crie a conta de administrador e comece a usar em minutos.
        </p>

        <form onSubmit={cadastrar} className="space-y-4">
          <Campo rotulo="Nome da clínica" htmlFor="clinica" obrigatorio>
            <Input
              id="clinica"
              value={clinica}
              onChange={(e) => setClinica(e.target.value)}
              placeholder="Ex.: Clínica Vida Animal"
              required
            />
          </Campo>
          <Campo rotulo="Seu nome" htmlFor="nome" obrigatorio>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
            />
          </Campo>
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
          <Campo
            rotulo="Senha"
            htmlFor="senha"
            obrigatorio
            dica="Mínimo de 8 caracteres, com letras e números."
          >
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Campo>

          {erro && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
