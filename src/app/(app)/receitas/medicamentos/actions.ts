"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessao } from "@/lib/auth";
import { redirecionarComAviso } from "@/lib/aviso";
import { FORMAS_FARMACEUTICAS, VIAS_ADMINISTRACAO } from "@/lib/types";

const ROTA = "/receitas/medicamentos";

const listaFechada = (valores: { valor: string }[], mensagem: string) =>
  z.string().refine((v) => v === "" || valores.some((o) => o.valor === v), mensagem);

const schema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome do medicamento.")
    .max(160, "Nome longo demais."),
  concentracao: z.string().trim().max(80, "Concentração longa demais."),
  forma_farmaceutica: listaFechada(FORMAS_FARMACEUTICAS, "Forma farmacêutica inválida."),
  via: listaFechada(VIAS_ADMINISTRACAO, "Via de administração inválida."),
  quantidade_padrao: z.string().trim().max(80, "Quantidade longa demais."),
  posologia_padrao: z.string().trim().max(500, "Posologia longa demais."),
  observacao: z.string().trim().max(300, "Observação longa demais."),
});

/** Recepção não prescreve, então também não mexe no caderno de medicamentos. */
async function exigirQuemPrescreve() {
  const sessao = await getSessao();
  if (sessao.usuario.papel === "recepcao") redirect("/dashboard");
  return sessao;
}

export async function salvarMedicamento(id: string | null, formData: FormData) {
  const { supabase, usuario } = await exigirQuemPrescreve();

  const resultado = schema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    concentracao: String(formData.get("concentracao") ?? ""),
    forma_farmaceutica: String(formData.get("forma_farmaceutica") ?? ""),
    via: String(formData.get("via") ?? ""),
    quantidade_padrao: String(formData.get("quantidade_padrao") ?? ""),
    posologia_padrao: String(formData.get("posologia_padrao") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  });
  if (!resultado.success) {
    return redirecionarComAviso(
      `${ROTA}?erro=${encodeURIComponent(resultado.error.issues[0]?.message ?? "Verifique os campos.")}`
    );
  }

  // Campo vazio vira NULL, e não string vazia: assim "sem concentração" é uma
  // coisa só no banco, e a chave única (clinica, nome, concentracao) não deixa
  // passar o mesmo medicamento duas vezes por causa de um espaço.
  const d = resultado.data;
  const linha = {
    nome: d.nome,
    concentracao: d.concentracao || null,
    forma_farmaceutica: d.forma_farmaceutica || null,
    via: d.via || null,
    quantidade_padrao: d.quantidade_padrao || null,
    posologia_padrao: d.posologia_padrao || null,
    observacao: d.observacao || null,
  };

  const { error } = id
    ? await supabase.from("medicamento_receita").update(linha).eq("id", id)
    : await supabase
        .from("medicamento_receita")
        .insert({ ...linha, clinica_id: usuario.clinica_id });

  if (error) {
    const repetido = error.code === "23505";
    return redirecionarComAviso(
      `${ROTA}?erro=${encodeURIComponent(
        repetido
          ? "Já existe um medicamento com esse nome e essa concentração."
          : "Não foi possível salvar o medicamento."
      )}`
    );
  }

  revalidatePath(ROTA);
  redirect(ROTA);
}

export async function excluirMedicamento(id: string) {
  const { supabase } = await exigirQuemPrescreve();

  const { error } = await supabase.from("medicamento_receita").delete().eq("id", id);
  if (error) {
    return redirecionarComAviso(
      `${ROTA}?erro=${encodeURIComponent("Não foi possível excluir o medicamento.")}`
    );
  }

  revalidatePath(ROTA);
  redirect(ROTA);
}
