"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import {
  CATEGORIA_DO_TIPO,
  type CategoriaTipo,
  type ContaStatus,
  type ContaTipo,
  type Papel,
} from "@/lib/types";
import {
  baixaSchema,
  categoriaSchema,
  centavos,
  contaSchema,
  somarMeses,
  valorParaNumero,
} from "./schema";

/**
 * Server actions do financeiro. Toda action: getSessao() → papel → zod →
 * clinica_id do usuário logado (o RLS ainda barra de novo no banco).
 */

/** Quem mexe no caixa: veterinário só consulta. */
const PAPEIS_CAIXA: Papel[] = ["admin", "recepcao"];

/** Cancelar e excluir mexem no histórico: só administrador. */
const PAPEIS_ADMIN: Papel[] = ["admin"];

// ------------------------------------------------------------------
// Auxiliares
// ------------------------------------------------------------------

/** Anexa ?erro= (ou &erro=) preservando os filtros que já estavam na URL. */
function comErro(url: string, mensagem: string): string {
  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}erro=${encodeURIComponent(mensagem)}`;
}

/**
 * O caminho de retorno vem do formulário (para voltar com os filtros da
 * lista). Só aceitamos rotas internas do financeiro, nunca redirecionar
 * para um endereço que o cliente escolheu.
 */
function destinoSeguro(voltar: string | null | undefined): string {
  const v = (voltar ?? "").trim();
  return v.startsWith("/financeiro") && !v.startsWith("//") ? v : "/financeiro";
}

function revalidarFinanceiro(): void {
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro/pagar");
  revalidatePath("/dashboard");
}

const tipoValido = (v: string): ContaTipo => (v === "pagar" ? "pagar" : "receber");

/** Lê e valida os campos comuns dos formulários de conta. */
function lerFormConta(formData: FormData) {
  return contaSchema.safeParse({
    tipo: String(formData.get("tipo") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    categoria_id: String(formData.get("categoria_id") ?? ""),
    valor: valorParaNumero(String(formData.get("valor") ?? "")),
    vencimento: String(formData.get("vencimento") ?? ""),
    tutor_id: String(formData.get("tutor_id") ?? ""),
    fornecedor: String(formData.get("fornecedor") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
    repetir: formData.get("repetir") === "on",
    meses: Number(formData.get("meses") ?? 1) || 1,
  });
}

/** A categoria precisa existir na clínica e casar com o tipo da conta. */
async function categoriaCompativel(
  supabase: Awaited<ReturnType<typeof getSessao>>["supabase"],
  categoriaId: string,
  tipo: ContaTipo
): Promise<boolean> {
  if (!categoriaId) return true; // categoria é opcional
  const { data } = await supabase
    .from("categoria_financeira")
    .select("id, tipo")
    .eq("id", categoriaId)
    .single<{ id: string; tipo: CategoriaTipo }>();
  return !!data && data.tipo === CATEGORIA_DO_TIPO[tipo];
}

// ------------------------------------------------------------------
// Contas
// ------------------------------------------------------------------

export async function criarConta(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const tipoBruto = tipoValido(String(formData.get("tipo") ?? ""));
  const voltar = `/financeiro/nova?tipo=${tipoBruto}`;

  if (!PAPEIS_CAIXA.includes(usuario.papel)) {
    redirect(comErro(voltar, "Seu perfil não pode cadastrar contas."));
  }

  const resultado = lerFormConta(formData);
  if (!resultado.success) {
    redirect(comErro(voltar, resultado.error.issues[0]?.message ?? "Verifique os campos."));
  }

  const dados = resultado.data;

  if (!(await categoriaCompativel(supabase, dados.categoria_id, dados.tipo))) {
    redirect(comErro(voltar, "Categoria inválida para este tipo de conta."));
  }

  // Repetição: N contas iguais, uma por mês, a partir do vencimento informado.
  // A descrição ganha "(1/12)" para o usuário se achar na lista.
  const parcelas = dados.repetir ? dados.meses : 1;
  const linhas = Array.from({ length: parcelas }, (_, i) => ({
    clinica_id: usuario.clinica_id,
    tipo: dados.tipo,
    descricao:
      parcelas > 1 ? `${dados.descricao} (${i + 1}/${parcelas})` : dados.descricao,
    categoria_id: dados.categoria_id || null,
    // tutor só faz sentido em conta a receber; fornecedor, em conta a pagar
    tutor_id: dados.tipo === "receber" ? dados.tutor_id || null : null,
    fornecedor: dados.tipo === "pagar" ? dados.fornecedor || null : null,
    valor: centavos(dados.valor),
    vencimento: somarMeses(dados.vencimento, i),
    observacao: dados.observacao || null,
    registrado_por: usuario.id,
  }));

  const { error } = await supabase.from("conta").insert(linhas);
  if (error) redirect(comErro(voltar, "Não foi possível salvar a conta."));

  revalidarFinanceiro();
  redirect(`/financeiro/${dados.tipo}`);
}

export async function atualizarConta(id: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const voltar = `/financeiro/${id}/editar`;

  if (!PAPEIS_CAIXA.includes(usuario.papel)) {
    redirect(comErro(voltar, "Seu perfil não pode editar contas."));
  }

  const resultado = lerFormConta(formData);
  if (!resultado.success) {
    redirect(comErro(voltar, resultado.error.issues[0]?.message ?? "Verifique os campos."));
  }

  const dados = resultado.data;

  if (!(await categoriaCompativel(supabase, dados.categoria_id, dados.tipo))) {
    redirect(comErro(voltar, "Categoria inválida para este tipo de conta."));
  }

  const { error } = await supabase
    .from("conta")
    .update({
      tipo: dados.tipo,
      descricao: dados.descricao,
      categoria_id: dados.categoria_id || null,
      tutor_id: dados.tipo === "receber" ? dados.tutor_id || null : null,
      fornecedor: dados.tipo === "pagar" ? dados.fornecedor || null : null,
      valor: centavos(dados.valor),
      vencimento: dados.vencimento,
      observacao: dados.observacao || null,
    })
    .eq("id", id);

  if (error) redirect(comErro(voltar, "Não foi possível salvar a conta."));

  revalidarFinanceiro();
  redirect(`/financeiro/${dados.tipo}`);
}

/**
 * Dar baixa: registra QUANTO entrou/saiu agora. O valor informado é somado
 * ao que já havia sido pago. Se o total alcançar o valor da conta ela vira
 * 'paga'; se ficar abaixo, vira 'parcial'.
 */
export async function darBaixa(id: string, voltarBruto: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const voltar = destinoSeguro(voltarBruto);

  if (!PAPEIS_CAIXA.includes(usuario.papel)) {
    redirect(comErro(voltar, "Seu perfil não pode dar baixa em contas."));
  }

  const resultado = baixaSchema.safeParse({
    valor_pago: valorParaNumero(String(formData.get("valor_pago") ?? "")),
    pagamento: String(formData.get("pagamento") ?? ""),
    forma_pagamento: String(formData.get("forma_pagamento") ?? ""),
  });

  if (!resultado.success) {
    redirect(comErro(voltar, resultado.error.issues[0]?.message ?? "Verifique os campos."));
  }

  const { data: conta } = await supabase
    .from("conta")
    .select("id, valor, valor_pago, status")
    .eq("id", id)
    .single<{ id: string; valor: number; valor_pago: number; status: ContaStatus }>();

  if (!conta) redirect(comErro(voltar, "Conta não encontrada."));
  if (conta.status === "cancelada") {
    redirect(comErro(voltar, "Conta cancelada não recebe baixa."));
  }

  const totalPago = centavos(Number(conta.valor_pago) + resultado.data.valor_pago);
  // margem de meio centavo evita marcar como 'parcial' por arredondamento
  const status: ContaStatus =
    totalPago >= Number(conta.valor) - 0.005 ? "paga" : "parcial";

  const { error } = await supabase
    .from("conta")
    .update({
      valor_pago: totalPago,
      pagamento: resultado.data.pagamento,
      forma_pagamento: resultado.data.forma_pagamento || null,
      status,
    })
    .eq("id", id);

  if (error) redirect(comErro(voltar, "Não foi possível dar baixa na conta."));

  revalidarFinanceiro();
  redirect(voltar);
}

/** Desfaz a baixa: zera o pago e devolve a conta para 'aberta'. */
export async function estornarBaixa(id: string, voltarBruto: string) {
  const { supabase, usuario } = await getSessao();
  const voltar = destinoSeguro(voltarBruto);

  if (!PAPEIS_CAIXA.includes(usuario.papel)) {
    redirect(comErro(voltar, "Seu perfil não pode estornar baixas."));
  }

  const { error } = await supabase
    .from("conta")
    .update({
      valor_pago: 0,
      pagamento: null,
      forma_pagamento: null,
      status: "aberta",
    })
    .eq("id", id);

  if (error) redirect(comErro(voltar, "Não foi possível estornar a baixa."));

  revalidarFinanceiro();
  redirect(voltar);
}

export async function cancelarConta(id: string, voltarBruto: string) {
  const { supabase, usuario } = await getSessao();
  const voltar = destinoSeguro(voltarBruto);

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    redirect(comErro(voltar, "Só o administrador pode cancelar contas."));
  }

  const { error } = await supabase
    .from("conta")
    .update({ status: "cancelada" })
    .eq("id", id);

  if (error) redirect(comErro(voltar, "Não foi possível cancelar a conta."));

  revalidarFinanceiro();
  redirect(voltar);
}

export async function excluirConta(id: string, voltarBruto: string) {
  const { supabase, usuario } = await getSessao();
  const voltar = destinoSeguro(voltarBruto);

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    redirect(comErro(voltar, "Só o administrador pode excluir contas."));
  }

  const { error } = await supabase.from("conta").delete().eq("id", id);
  if (error) redirect(comErro(voltar, "Não foi possível excluir a conta."));

  revalidarFinanceiro();
  redirect(voltar);
}

// ------------------------------------------------------------------
// Categorias financeiras
// ------------------------------------------------------------------

const ROTA_CATEGORIAS = "/financeiro/categorias";

export async function criarCategoria(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  if (!PAPEIS_CAIXA.includes(usuario.papel)) {
    redirect(comErro(ROTA_CATEGORIAS, "Seu perfil não pode criar categorias."));
  }

  const resultado = categoriaSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
  });

  if (!resultado.success) {
    redirect(
      comErro(ROTA_CATEGORIAS, resultado.error.issues[0]?.message ?? "Verifique os campos.")
    );
  }

  const { error } = await supabase.from("categoria_financeira").insert({
    clinica_id: usuario.clinica_id,
    nome: resultado.data.nome,
    tipo: resultado.data.tipo,
  });

  // unique (clinica_id, nome, tipo): nome repetido cai aqui
  if (error) {
    redirect(comErro(ROTA_CATEGORIAS, "Já existe uma categoria com esse nome."));
  }

  revalidatePath(ROTA_CATEGORIAS);
  revalidarFinanceiro();
  redirect(ROTA_CATEGORIAS);
}

export async function renomearCategoria(
  id: string,
  tipo: CategoriaTipo,
  formData: FormData
) {
  const { supabase, usuario } = await getSessao();

  if (!PAPEIS_CAIXA.includes(usuario.papel)) {
    redirect(comErro(ROTA_CATEGORIAS, "Seu perfil não pode editar categorias."));
  }

  const resultado = categoriaSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    tipo,
  });

  if (!resultado.success) {
    redirect(
      comErro(ROTA_CATEGORIAS, resultado.error.issues[0]?.message ?? "Verifique os campos.")
    );
  }

  const { error } = await supabase
    .from("categoria_financeira")
    .update({ nome: resultado.data.nome })
    .eq("id", id);

  if (error) {
    redirect(comErro(ROTA_CATEGORIAS, "Já existe uma categoria com esse nome."));
  }

  revalidatePath(ROTA_CATEGORIAS);
  revalidarFinanceiro();
  redirect(ROTA_CATEGORIAS);
}

export async function excluirCategoria(id: string) {
  const { supabase, usuario } = await getSessao();

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    redirect(comErro(ROTA_CATEGORIAS, "Só o administrador pode excluir categorias."));
  }

  // As contas que usavam a categoria ficam sem categoria (on delete set null).
  const { error } = await supabase.from("categoria_financeira").delete().eq("id", id);
  if (error) redirect(comErro(ROTA_CATEGORIAS, "Não foi possível excluir a categoria."));

  revalidatePath(ROTA_CATEGORIAS);
  revalidarFinanceiro();
  redirect(ROTA_CATEGORIAS);
}
