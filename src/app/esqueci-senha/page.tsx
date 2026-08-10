"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { schemaEmailObrigatorio } from "@/lib/validacao";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";

/**
 * Recuperação de senha.
 *
 * Sem isto, a clínica que esquece a senha fica trancada para fora do próprio
 * sistema e só volta se alguém com a chave do banco resolver na mão — o que
 * não escala nem para dez clientes, e menos ainda de madrugada.
 *
 * A resposta é SEMPRE a mesma, exista o e-mail ou não. Dizer "este e-mail não
 * está cadastrado" entregaria a quem tem uma lista de e-mails quais deles são
 * clientes do VetHub, e é uma resposta que não ajuda ninguém de boa-fé: quem
 * errou o próprio e-mail vai perceber quando a mensagem não chegar.
 */
const schema = z.object({ email: schemaEmailObrigatorio });
type Valores = z.infer<typeof schema>;

export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(schema) });

  async function enviar(valores: Valores) {
    setCarregando(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(valores.email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    });
    // Nem o erro muda a tela: ver "falhou" para um e-mail e "enviado" para
    // outro é a mesma entrega de informação, por outro caminho.
    setEnviado(true);
    setCarregando(false);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Wordmark sobre="auto" className="mb-8 text-3xl" />

      <div className="glass w-full max-w-md rounded-2xl p-6 sm:p-8">
        {enviado ? (
          <div className="text-center">
            <span className="glass-forte mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
              <MailCheck className="size-7" strokeWidth={1.8} aria-hidden />
            </span>
            <h1 className="text-lg font-bold text-ink">Verifique seu e-mail</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Se este e-mail estiver cadastrado, enviamos um link para você
              criar uma senha nova. Ele vale por uma hora.
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Não chegou? Veja a caixa de spam antes de pedir de novo.
            </p>
            <Link
              href="/login"
              className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/15 text-sm font-medium text-ink"
            >
              <ArrowLeft className="size-4" />
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-ink">Esqueceu a senha?</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Informe o e-mail da sua conta e enviamos um link para criar outra.
            </p>

            <form onSubmit={handleSubmit(enviar)} className="mt-5 space-y-4" noValidate>
              <Campo rotulo="E-mail" htmlFor="email" obrigatorio erro={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </Campo>

              <Button type="submit" className="w-full" disabled={carregando}>
                {carregando ? "Enviando…" : "Enviar link"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-muted">
              Lembrou?{" "}
              <Link href="/login" className="link-vidro font-medium">
                Voltar para o login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
