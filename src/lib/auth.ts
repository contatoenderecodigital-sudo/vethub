import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types";

/** Cookie com a unidade escolhida no cabeçalho. */
export const COOKIE_UNIDADE = "vethub_unidade";

export interface UnidadeSessao {
  id: string;
  nome: string;
  principal: boolean;
}

/**
 * Carrega o usuário logado + perfil (com clinica_id) em código de servidor.
 * Redireciona para /login se não houver sessão válida.
 *
 * Traz também a UNIDADE em que a pessoa está trabalhando agora, e as que ela
 * pode alcançar. Quem está preso a uma unidade só enxerga aquela; quem não
 * está (dono, gerente) escolhe no cabeçalho e a escolha vive num cookie.
 *
 * A escolha é sempre conferida contra a lista de unidades permitidas — um
 * cookie é editável pelo usuário, e sem essa checagem daria para espiar o
 * caixa de outra filial trocando um valor no navegador.
 */
export async function getSessao() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("id, clinica_id, nome, email, papel, unidade_id")
    .eq("id", user.id)
    .single<Usuario & { unidade_id: string | null }>();

  if (!usuario) redirect("/login");

  const { data: todas } = await supabase
    .from("unidade")
    .select("id, nome, principal")
    .eq("ativa", true)
    .order("principal", { ascending: false })
    .order("nome")
    .returns<UnidadeSessao[]>();

  const disponiveis = (todas ?? []).filter(
    (u) => !usuario.unidade_id || u.id === usuario.unidade_id
  );

  const escolhida = (await cookies()).get(COOKIE_UNIDADE)?.value;
  const unidade =
    disponiveis.find((u) => u.id === escolhida) ??
    disponiveis.find((u) => u.principal) ??
    disponiveis[0] ??
    null;

  return { supabase, usuario, unidade, unidades: disponiveis };
}
