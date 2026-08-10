import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * O painel do dono do VetHub, que enxerga TODAS as clínicas.
 *
 * POR QUE A PERMISSÃO NÃO MORA NO BANCO
 *
 * O caminho óbvio seria uma coluna `super_admin` em `usuario`. Seria um furo
 * grave: o RLS permite que o admin de uma clínica edite os usuários DELA, e
 * ele mesmo é um deles. Bastaria uma requisição gravando `super_admin = true`
 * no próprio perfil para qualquer cliente virar dono do sistema inteiro e ler
 * a base de todo mundo.
 *
 * Por isso a lista vive numa variável de ambiente, fora do alcance de
 * qualquer requisição. Para entrar nela é preciso acesso ao painel da Vercel.
 *
 * A leitura usa `service_role` porque a pergunta é justamente
 * entre-clínicas — o RLS existe para impedir isso, e aqui é o único lugar
 * do sistema onde atravessá-lo é o objetivo.
 */

/** E-mails que podem abrir o painel. Separados por vírgula. */
function donosPermitidos(): string[] {
  return (process.env.VETHUB_DONOS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Garante que quem chama é o dono, e devolve o cliente que enxerga tudo.
 *
 * Manda para o painel comum em vez de mostrar "acesso negado": quem não é
 * dono não precisa descobrir que este lugar existe.
 */
export async function exigirDono() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const permitidos = donosPermitidos();

  // Sem a variável configurada, ninguém entra. O contrário — liberar geral
  // quando a lista está vazia — transformaria um esquecimento de
  // configuração no pior vazamento possível.
  if (!permitidos.includes(user.email.toLowerCase())) redirect("/dashboard");

  return { admin: createAdminClient(), email: user.email };
}

/** O painel existe para este usuário? Usado só para decidir se mostra o link. */
export async function ehDono(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  return donosPermitidos().includes(email.toLowerCase());
}
