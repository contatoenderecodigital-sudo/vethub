"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirecionarComAviso } from "@/lib/aviso";
import { getSessao } from "@/lib/auth";
import { receitaSchema, type ReceitaFormValores } from "./schema";

const ERRO_PERMISSAO = "Seu perfil não pode emitir receitas.";

/** Texto do form: '' vira null no banco. */
const ouNulo = (v: string) => (v.trim() ? v.trim() : null);

/**
 * Lê o formulário inteiro (cabeçalho + JSON dos medicamentos vindo do input
 * hidden) e revalida com o MESMO schema zod do editor. Nunca confiar no front.
 */
function validarForm(
  formData: FormData
): { dados: ReceitaFormValores } | { erro: string } {
  const texto = (campo: string) => String(formData.get(campo) ?? "");

  let medicamentos: unknown;
  try {
    medicamentos = JSON.parse(texto("medicamentos") || "[]");
  } catch {
    return { erro: "Não foi possível ler os medicamentos da receita." };
  }
  // Linhas totalmente em branco (sem nome do medicamento) são descartadas
  // antes do parse, o zod cuida do resto.
  if (Array.isArray(medicamentos)) {
    medicamentos = medicamentos.filter((bruto) => {
      const linha = (typeof bruto === "object" && bruto !== null ? bruto : {}) as {
        medicamento?: unknown;
        posologia?: unknown;
      };
      return (
        String(linha.medicamento ?? "").trim() !== "" ||
        String(linha.posologia ?? "").trim() !== ""
      );
    });
  }

  const resultado = receitaSchema.safeParse({
    pet_id: texto("pet_id").trim(),
    veterinario_id: texto("veterinario_id"),
    consulta_id: texto("consulta_id"),
    tipo: texto("tipo") || "simples",
    data: texto("data"),
    orientacoes: texto("orientacoes"),
    retorno_em: texto("retorno_em"),
    medicamentos,
  });

  if (!resultado.success) {
    return {
      erro: resultado.error.issues[0]?.message ?? "Verifique os campos da receita.",
    };
  }
  return { dados: resultado.data };
}

/** Cabeçalho pronto para o banco. */
function cabecalhoParaBanco(valores: ReceitaFormValores) {
  return {
    pet_id: valores.pet_id,
    consulta_id: valores.consulta_id.trim() || null,
    veterinario_id: valores.veterinario_id.trim() || null,
    tipo: valores.tipo,
    data: valores.data,
    orientacoes: ouNulo(valores.orientacoes),
    retorno_em: valores.retorno_em.trim() || null,
  };
}

/** Itens prontos para o banco, já numerados na ordem da tela. */
function itensParaBanco(valores: ReceitaFormValores, receitaId: string) {
  return valores.medicamentos.map((m, indice) => ({
    receita_id: receitaId,
    medicamento: m.medicamento,
    concentracao: ouNulo(m.concentracao),
    forma_farmaceutica: ouNulo(m.forma_farmaceutica),
    quantidade: ouNulo(m.quantidade),
    posologia: m.posologia,
    via: ouNulo(m.via),
    observacao: ouNulo(m.observacao),
    ordem: indice,
  }));
}

export async function criarReceita(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel === "recepcao") return redirecionarComAviso(`/receitas?erro=${ERRO_PERMISSAO}`);

  const petParam = String(formData.get("pet_id") ?? "").trim();
  const consultaParam = String(formData.get("consulta_id") ?? "").trim();

  // Volta para o form preservando o contexto (pet/consulta) e mostrando o erro.
  const urlErro = (mensagem: string) => {
    const sp = new URLSearchParams();
    if (petParam) sp.set("pet", petParam);
    if (consultaParam) sp.set("consulta", consultaParam);
    sp.set("erro", mensagem);
    return `/receitas/nova?${sp.toString()}`;
  };

  const validado = validarForm(formData);
  if ("erro" in validado) redirect(urlErro(validado.erro));

  const { data: receita, error } = await supabase
    .from("receita")
    .insert({ clinica_id: usuario.clinica_id, ...cabecalhoParaBanco(validado.dados) })
    .select("id")
    .single<{ id: string }>();

  if (error || !receita) redirect(urlErro("Não foi possível criar a receita."));

  const { error: erroItens } = await supabase
    .from("receita_item")
    .insert(itensParaBanco(validado.dados, receita.id));

  if (erroItens) {
    // Sem os medicamentos a receita não existe. Desfaz o cabeçalho.
    await supabase.from("receita").delete().eq("id", receita.id);
    redirect(urlErro("Não foi possível salvar os medicamentos."));
  }

  revalidatePath("/receitas");
  revalidatePath(`/pets/${validado.dados.pet_id}`);
  redirect(`/receitas/${receita.id}`);
}

export async function atualizarReceita(id: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel === "recepcao") return redirecionarComAviso(`/receitas/${id}?erro=${ERRO_PERMISSAO}`);

  const validado = validarForm(formData);
  if ("erro" in validado) {
    return redirecionarComAviso(`/receitas/${id}/editar?erro=${validado.erro}`);
  }

  const { error } = await supabase
    .from("receita")
    .update(cabecalhoParaBanco(validado.dados))
    .eq("id", id);

  if (error) return redirecionarComAviso(`/receitas/${id}/editar?erro=Não foi possível salvar.`);

  // Os medicamentos são regravados por inteiro (a ordem faz parte do documento).
  const { error: erroDelete } = await supabase
    .from("receita_item")
    .delete()
    .eq("receita_id", id);
  if (erroDelete) {
    return redirecionarComAviso(`/receitas/${id}/editar?erro=Não foi possível salvar os medicamentos.`);
  }

  const { error: erroInsert } = await supabase
    .from("receita_item")
    .insert(itensParaBanco(validado.dados, id));
  if (erroInsert) {
    return redirecionarComAviso(`/receitas/${id}/editar?erro=Não foi possível salvar os medicamentos.`);
  }

  revalidatePath("/receitas");
  revalidatePath(`/receitas/${id}`);
  revalidatePath(`/pets/${validado.dados.pet_id}`);
  redirect(`/receitas/${id}`);
}

export async function excluirReceita(id: string, petId: string) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel === "recepcao") return redirecionarComAviso(`/receitas/${id}?erro=${ERRO_PERMISSAO}`);

  // receita_item tem ON DELETE CASCADE: some junto com o cabeçalho.
  const { error } = await supabase.from("receita").delete().eq("id", id);
  if (error) return redirecionarComAviso(`/receitas/${id}?erro=Não foi possível excluir.`);

  revalidatePath("/receitas");
  revalidatePath(`/pets/${petId}`);
  redirect("/receitas");
}
