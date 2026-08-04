import { getSessao } from "@/lib/auth";

/**
 * Sessão + nome da clínica (que vai no cabeçalho de impressão de todo
 * relatório). Uma chamada só, para não repetir a consulta em cada página.
 */
export async function abrirRelatorio() {
  const { supabase, usuario } = await getSessao();

  const { data: clinica } = await supabase
    .from("clinica")
    .select("nome")
    .eq("id", usuario.clinica_id)
    .single<{ nome: string }>();

  return { supabase, usuario, clinica: clinica?.nome ?? "Clínica veterinária" };
}

export interface OpcaoSimples {
  id: string;
  nome: string;
}
