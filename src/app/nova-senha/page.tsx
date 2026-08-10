"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { schemaSenhaForte } from "@/lib/validacao";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/form";

/**
 * A tela onde o link do e-mail termina.
 *
 * O Supabase entrega a sessão de recuperação de dois jeitos, e os dois
 * precisam funcionar: pelo evento `PASSWORD_RECOVERY` (quando o token vem no
 * fragmento da URL) e pelo `code` na query, do fluxo PKCE. Tratar só um
 * deixaria metade dos e-mails levando a uma tela que não faz nada — e a
 * pessoa que não consegue entrar não tem como avisar que não consegue entrar.
 *
 * Depois de trocar, manda direto para o sistema: quem acabou de provar que é
 * dono do e-mail já está autenticado, e pedir para logar de novo seria
 * burocracia sem ganho de segurança.
 */
const schema = z
  .object({
    senha: schemaSenhaForte,
    confirmacao: z.string(),
  })
  .refine((v) => v.senha === v.confirmacao, {
    message: "As senhas não são iguais.",
    path: ["confirmacao"],
  });

type Valores = z.infer<typeof schema>;

export default function NovaSenhaPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const supabase = createClient();

    // Só o evento de RECUPERAÇÃO libera o formulário — sessão comum não.
    //
    // Aceitar qualquer sessão logada abriria um buraco: um computador
    // destravado no balcão viraria conta sequestrada em dez segundos, porque
    // aqui não se pede a senha atual. Quem já está dentro e quer trocar usa
    // /configuracoes/senha, que pede a atual antes.
    const { data: assinatura } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") setPronto(true);
    });

    // O fluxo PKCE traz `?code=` em vez do fragmento: aqui a sessão de
    // recuperação só existe depois de trocar o código.
    const codigo = new URLSearchParams(window.location.search).get("code");
    (async () => {
      if (codigo) {
        const { error } = await supabase.auth.exchangeCodeForSession(codigo);
        if (!error) return setPronto(true);
        return setSemSessao(true);
      }
      // Sem código na URL, resta o token no fragmento, que chega pelo evento
      // acima. Um respiro para ele acontecer antes de declarar link inválido.
      const temFragmento = window.location.hash.includes("access_token");
      if (!temFragmento) setSemSessao(true);
      else setTimeout(() => setPronto((p) => p || false), 0);
    })();

    return () => assinatura.subscription.unsubscribe();
  }, []);

  async function salvar(valores: Valores) {
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: valores.senha });
    if (error) {
      setErro("Não foi possível salvar. Peça um link novo e tente de novo.");
      setCarregando(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Wordmark sobre="auto" className="mb-8 text-3xl" />

      <div className="glass w-full max-w-md rounded-2xl p-6 sm:p-8">
        <h1 className="text-lg font-bold text-ink">Criar nova senha</h1>

        {semSessao ? (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              Este link não vale mais. Eles duram uma hora e só podem ser usados
              uma vez.
            </p>
            <Link
              href="/esqueci-senha"
              className="mt-5 flex min-h-11 items-center justify-center rounded-lg bg-white text-sm font-semibold text-brand-dark"
            >
              Pedir um link novo
            </Link>
          </>
        ) : !pronto ? (
          <p className="mt-2 text-sm text-ink-muted">Verificando o link…</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              Escolha uma senha que você não use em outro lugar.
            </p>

            {erro && (
              <p className="mt-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
                {erro}
              </p>
            )}

            <form onSubmit={handleSubmit(salvar)} className="mt-5 space-y-4" noValidate>
              <Campo
                rotulo="Nova senha"
                htmlFor="senha"
                obrigatorio
                erro={errors.senha?.message}
              >
                <Input
                  id="senha"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  aria-invalid={!!errors.senha}
                  {...register("senha")}
                />
              </Campo>

              <Campo
                rotulo="Repita a senha"
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

              <Button type="submit" className="w-full" disabled={carregando}>
                {carregando ? "Salvando…" : "Salvar e entrar"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
