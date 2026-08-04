import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types";

/**
 * Carrega o usuário logado + perfil (com clinica_id) em código de servidor.
 * Redireciona para /login se não houver sessão válida.
 */
export async function getSessao() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("id, clinica_id, nome, email, papel")
    .eq("id", user.id)
    .single<Usuario>();

  if (!usuario) redirect("/login");

  return { supabase, usuario };
}
