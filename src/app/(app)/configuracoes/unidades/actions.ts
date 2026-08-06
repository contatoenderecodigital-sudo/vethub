"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { redirecionarComAviso } from "@/lib/aviso";
import { getSessao } from "@/lib/auth";
import { enderecoParaBanco, camposEndereco, soDigitos } from "@/lib/validacao";

const ROTA = "/configuracoes/unidades";

const unidadeSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da unidade."),
  cnpj: z.string().trim(),
  telefone: z.string().trim(),
  ...camposEndereco,
});

async function comErro(mensagem: string): Promise<never> {
  return redirecionarComAviso(`${ROTA}?erro=${encodeURIComponent(mensagem)}`);
}

function ler(formData: FormData) {
  return unidadeSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    cnpj: String(formData.get("cnpj") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
  });
}

export async function criarUnidade(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") return comErro("Só o administrador gerencia unidades.");

  const resultado = ler(formData);
  if (!resultado.success) {
    return comErro(resultado.error.issues[0]?.message ?? "Verifique os campos.");
  }

  const v = resultado.data;
  const { error } = await supabase.from("unidade").insert({
    clinica_id: usuario.clinica_id,
    nome: v.nome,
    cnpj: soDigitos(v.cnpj) || null,
    telefone: soDigitos(v.telefone) || null,
    ...enderecoParaBanco(v),
  });

  if (error) return comErro("Não foi possível criar a unidade.");

  revalidatePath(ROTA);
  redirect(ROTA);
}

export async function renomearUnidade(id: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") return comErro("Só o administrador gerencia unidades.");

  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < 2) return comErro("Informe o nome da unidade.");

  const { error } = await supabase.from("unidade").update({ nome }).eq("id", id);
  if (error) return comErro("Não foi possível renomear a unidade.");

  revalidatePath(ROTA);
  redirect(ROTA);
}

/**
 * Desativa em vez de excluir. Unidade tem estoque, caixa e histórico de
 * vendas pendurados: apagar deixaria movimentação órfã e saldo errado. Quem
 * fecha uma filial quer que ela pare de aparecer nos seletores, não que o
 * passado dela desapareça do relatório.
 */
export async function alternarUnidade(id: string, ativa: boolean) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") return comErro("Só o administrador gerencia unidades.");

  const { data: alvo } = await supabase
    .from("unidade")
    .select("principal")
    .eq("id", id)
    .maybeSingle<{ principal: boolean }>();

  if (alvo?.principal && !ativa) {
    return comErro("A matriz não pode ser desativada.");
  }

  const { error } = await supabase.from("unidade").update({ ativa }).eq("id", id);
  if (error) return comErro("Não foi possível alterar a unidade.");

  revalidatePath(ROTA);
  redirect(ROTA);
}

/**
 * Define em qual unidade a pessoa trabalha. Vazio = enxerga a clínica
 * inteira, que é o caso do dono e de quem cuida do financeiro.
 */
export async function definirUnidadeDoUsuario(
  usuarioId: string,
  formData: FormData
) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") return comErro("Só o administrador gerencia unidades.");

  const unidadeId = String(formData.get("unidade_id") ?? "").trim() || null;

  const { error } = await supabase
    .from("usuario")
    .update({ unidade_id: unidadeId })
    .eq("id", usuarioId)
    .eq("clinica_id", usuario.clinica_id);

  if (error) return comErro("Não foi possível salvar a unidade da pessoa.");

  revalidatePath(ROTA);
  revalidatePath("/configuracoes/usuarios");
  redirect(ROTA);
}
