"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirecionarComAviso } from "@/lib/aviso";
import { z } from "zod";
import { getSessao } from "@/lib/auth";
import { FORMAS_PAGAMENTO, type Papel } from "@/lib/types";
import { dataCalendarioValida, tutorParaBanco, tutorSchema } from "@/lib/validacao";

/**
 * Revalida o form de tutor no servidor com o MESMO schema zod do front.
 * Retorna os dados prontos para o banco ou null se inválido.
 */
function validarForm(formData: FormData) {
  const resultado = tutorSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    email: String(formData.get("email") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    consentimento_lgpd: formData.get("consentimento_lgpd") === "on",
  });
  if (!resultado.success) return null;
  return tutorParaBanco(resultado.data); // telefone vira só dígitos com DDI 55
}

export async function criarTutor(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const dados = validarForm(formData);
  if (!dados) return redirecionarComAviso("/tutores/novo?erro=Verifique os campos destacados.");

  const { data, error } = await supabase
    .from("tutor")
    .insert({ ...dados, clinica_id: usuario.clinica_id })
    .select("id")
    .single();

  if (error) return redirecionarComAviso("/tutores/novo?erro=Não foi possível salvar.");

  revalidatePath("/tutores");
  redirect(`/tutores/${data.id}`);
}

export async function atualizarTutor(id: string, formData: FormData) {
  const { supabase } = await getSessao();

  const dados = validarForm(formData);
  if (!dados) return redirecionarComAviso(`/tutores/${id}/editar?erro=Verifique os campos destacados.`);

  const { error } = await supabase.from("tutor").update(dados).eq("id", id);
  if (error) return redirecionarComAviso(`/tutores/${id}/editar?erro=Não foi possível salvar.`);

  revalidatePath("/tutores");
  revalidatePath(`/tutores/${id}`);
  redirect(`/tutores/${id}`);
}

export async function excluirTutor(id: string) {
  const { supabase } = await getSessao();
  const { error } = await supabase.from("tutor").delete().eq("id", id);
  if (error) return redirecionarComAviso(`/tutores/${id}?erro=Não foi possível excluir.`);

  revalidatePath("/tutores");
  redirect("/tutores");
}

// ------------------------------------------------------------------
// Financeiro do tutor (débito / crédito)
// ------------------------------------------------------------------

/** Só quem mexe no caixa lança valores. Veterinário apenas consulta. */
const PAPEIS_FINANCEIRO: Papel[] = ["admin", "recepcao"];

/** Converte "1.234,56" (pt-BR) ou "1234.56" em número. NaN se não for número. */
function valorParaNumero(texto: string): number {
  const t = texto.trim();
  if (!t) return NaN;
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

const FORMAS_VALIDAS = FORMAS_PAGAMENTO.map((f) => f.valor) as string[];

const lancamentoSchema = z.object({
  tipo: z.enum(["debito", "credito"], { message: "Escolha débito ou crédito." }),
  valor: z
    .number({ message: "Informe um valor válido." })
    .refine((v) => Number.isFinite(v) && v > 0, "O valor precisa ser maior que zero.")
    .refine((v) => v <= 999999, "Valor máximo: R$ 999.999,00."),
  descricao: z.string().trim().min(1, "Informe a descrição do lançamento."),
  forma_pagamento: z
    .string()
    .refine((v) => v === "" || FORMAS_VALIDAS.includes(v), "Forma de pagamento inválida."),
  data: z
    .string()
    .min(1, "Informe a data.")
    .refine(dataCalendarioValida, "Data inválida."),
});

export async function registrarLancamento(tutorId: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const voltar = `/tutores/${tutorId}`;

  if (!PAPEIS_FINANCEIRO.includes(usuario.papel)) {
    return redirecionarComAviso(`${voltar}?erro=Seu perfil não pode lançar valores no financeiro.`);
  }

  const resultado = lancamentoSchema.safeParse({
    tipo: String(formData.get("tipo") ?? ""),
    valor: valorParaNumero(String(formData.get("valor") ?? "")),
    descricao: String(formData.get("descricao") ?? ""),
    forma_pagamento: String(formData.get("forma_pagamento") ?? ""),
    data: String(formData.get("data") ?? ""),
  });

  if (!resultado.success) {
    const msg = resultado.error.issues[0]?.message ?? "Verifique os campos.";
    return redirecionarComAviso(`${voltar}?erro=${encodeURIComponent(msg)}`);
  }

  const { tipo, valor, descricao, forma_pagamento, data } = resultado.data;

  // Livro único: o lançamento avulso é uma conta como qualquer outra.
  // Débito = o tutor deve à clínica (a receber). Crédito = a clínica deve a
  // ele, por troco guardado ou adiantamento (a pagar). É dessa oposição que
  // sai o sinal do extrato, sem precisar de um terceiro tipo.
  const { error } = await supabase.from("conta").insert({
    clinica_id: usuario.clinica_id,
    tipo: tipo === "debito" ? "receber" : "pagar",
    tutor_id: tutorId,
    // numeric(12,2): arredonda aqui para o banco nunca receber 3 casas
    valor: Math.round(valor * 100) / 100,
    descricao,
    forma_pagamento: forma_pagamento || null,
    competencia: data,
    vencimento: data,
    origem: "avulso",
    registrado_por: usuario.id,
  });

  if (error) return redirecionarComAviso(`${voltar}?erro=Não foi possível salvar o lançamento.`);

  revalidatePath("/tutores");
  revalidatePath(voltar);
  redirect(voltar);
}

export async function excluirLancamento(id: string, tutorId: string) {
  const { supabase, usuario } = await getSessao();
  const voltar = `/tutores/${tutorId}`;

  if (!PAPEIS_FINANCEIRO.includes(usuario.papel)) {
    return redirecionarComAviso(`${voltar}?erro=Seu perfil não pode excluir lançamentos.`);
  }

  const { error } = await supabase
    .from("conta")
    .delete()
    .eq("id", id);

  if (error) return redirecionarComAviso(`${voltar}?erro=Não foi possível excluir o lançamento.`);

  revalidatePath("/tutores");
  revalidatePath(voltar);
  redirect(voltar);
}
