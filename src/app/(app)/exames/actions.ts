"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessao } from "@/lib/auth";
import { redirecionarComAviso } from "@/lib/aviso";

const TIPOS = ["laboratorial", "imagem", "outro"] as const;

const solicitacaoSchema = z.object({
  pet_id: z.string().uuid("Escolha o pet."),
  consulta_id: z.string().uuid().or(z.literal("")),
  nome: z.string().trim().min(1, "Informe o exame.").max(160, "Nome longo demais."),
  tipo: z.enum(TIPOS),
  indicacao: z.string().trim().max(500, "Indicação longa demais."),
  previsto_para: z.string().trim(),
});

/** Recepção não pede exame: ela agenda e entrega o que o veterinário pediu. */
async function exigirQuemPrescreve(voltar: string) {
  const sessao = await getSessao();
  if (sessao.usuario.papel === "recepcao") {
    redirect(`${voltar}?erro=${encodeURIComponent("Só o veterinário pode solicitar exames.")}`);
  }
  return sessao;
}

export async function solicitarExame(voltar: string, formData: FormData) {
  const { supabase, usuario } = await exigirQuemPrescreve(voltar);

  const resultado = solicitacaoSchema.safeParse({
    pet_id: String(formData.get("pet_id") ?? ""),
    consulta_id: String(formData.get("consulta_id") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? "laboratorial"),
    indicacao: String(formData.get("indicacao") ?? ""),
    previsto_para: String(formData.get("previsto_para") ?? ""),
  });
  if (!resultado.success) {
    return redirecionarComAviso(
      `${voltar}?erro=${encodeURIComponent(resultado.error.issues[0]?.message ?? "Verifique os campos.")}`
    );
  }

  const d = resultado.data;
  const { error } = await supabase.from("exame").insert({
    clinica_id: usuario.clinica_id,
    pet_id: d.pet_id,
    consulta_id: d.consulta_id || null,
    veterinario_id: usuario.id,
    nome: d.nome,
    tipo: d.tipo,
    indicacao: d.indicacao || null,
    previsto_para: d.previsto_para || null,
  });

  if (error) {
    return redirecionarComAviso(
      `${voltar}?erro=${encodeURIComponent("Não foi possível solicitar o exame.")}`
    );
  }

  revalidatePath(voltar);
  revalidatePath("/exames");
  revalidatePath("/balcao");
  revalidatePath(`/pets/${d.pet_id}`);
  redirect(voltar);
}

const resultadoSchema = z.object({
  status: z.enum(["solicitado", "coletado", "pronto", "entregue", "cancelado"]),
  resultado: z.string().trim().max(4000, "Resultado longo demais."),
});

export async function registrarResultado(
  id: string,
  petId: string,
  voltar: string,
  formData: FormData
) {
  const { supabase } = await exigirQuemPrescreve(voltar);

  const parsed = resultadoSchema.safeParse({
    status: String(formData.get("status") ?? "pronto"),
    resultado: String(formData.get("resultado") ?? ""),
  });
  if (!parsed.success) {
    return redirecionarComAviso(
      `${voltar}?erro=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Verifique os campos.")}`
    );
  }

  // `resultado_em` marca quando o laudo chegou, e só na primeira vez: editar
  // o texto depois não deve mover a data em que o exame ficou pronto.
  const virouPronto = parsed.data.status === "pronto" || parsed.data.status === "entregue";

  const { error } = await supabase
    .from("exame")
    .update({
      status: parsed.data.status,
      resultado: parsed.data.resultado || null,
      ...(virouPronto ? { resultado_em: new Date().toISOString() } : {}),
    })
    .eq("id", id);

  if (error) {
    return redirecionarComAviso(
      `${voltar}?erro=${encodeURIComponent("Não foi possível salvar o resultado.")}`
    );
  }

  revalidatePath(voltar);
  revalidatePath("/exames");
  revalidatePath("/balcao");
  revalidatePath(`/pets/${petId}`);
  redirect(voltar);
}

export async function excluirExame(id: string, petId: string, voltar: string) {
  const { supabase } = await exigirQuemPrescreve(voltar);

  const { error } = await supabase.from("exame").delete().eq("id", id);
  if (error) {
    return redirecionarComAviso(
      `${voltar}?erro=${encodeURIComponent("Não foi possível excluir o exame.")}`
    );
  }

  revalidatePath(voltar);
  revalidatePath("/exames");
  revalidatePath(`/pets/${petId}`);
  redirect(voltar);
}
