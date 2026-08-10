"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirDono } from "@/lib/dono";
import { redirecionarComAviso } from "@/lib/aviso";
import { CICLOS, PLANOS } from "@/lib/plano-conta";

const ROTA = "/dono";

const erro = (mensagem: string) =>
  redirecionarComAviso(`${ROTA}?erro=${encodeURIComponent(mensagem)}`);

/**
 * Muda o plano de uma clínica na mão.
 *
 * É o que destrava vender antes de existir gateway: o dono combina o Pix,
 * recebe, e libera o plano aqui. O gatilho do banco só aceita esta mudança
 * vindo do `service_role`, que é exatamente o que `exigirDono` devolve.
 */
const planoSchema = z.object({
  plano: z.enum(PLANOS),
  ciclo: z.enum(CICLOS),
  limite_usuarios: z.string().trim(),
  renova_em: z.string().trim(),
});

export async function mudarPlano(clinicaId: string, formData: FormData) {
  const { admin } = await exigirDono();

  const r = planoSchema.safeParse({
    plano: String(formData.get("plano") ?? ""),
    ciclo: String(formData.get("ciclo") ?? ""),
    limite_usuarios: String(formData.get("limite_usuarios") ?? ""),
    renova_em: String(formData.get("renova_em") ?? ""),
  });
  if (!r.success) return erro(r.error.issues[0]?.message ?? "Verifique os campos.");

  const limite = r.data.limite_usuarios ? Number(r.data.limite_usuarios) : null;
  if (limite !== null && (!Number.isInteger(limite) || limite < 1)) {
    return erro("O limite de usuários precisa ser um número inteiro maior que zero.");
  }

  const { error } = await admin
    .from("clinica")
    .update({
      plano: r.data.plano,
      ciclo: r.data.ciclo,
      limite_usuarios: limite,
      renova_em: r.data.renova_em || null,
      // Sair do teste apaga o prazo dele: duas datas dizendo quando a conta
      // vence acabariam discordando uma da outra.
      ...(r.data.plano !== "trial" ? { trial_termina_em: null } : {}),
    })
    .eq("id", clinicaId);

  if (error) return erro(`Não foi possível salvar: ${error.message}`);

  revalidatePath(ROTA);
  redirect(ROTA);
}

/** Estica o teste de uma clínica que pediu mais tempo para decidir. */
export async function esticarTeste(clinicaId: string, dias: number) {
  const { admin } = await exigirDono();

  const nova = new Date();
  nova.setDate(nova.getDate() + dias);

  const { error } = await admin
    .from("clinica")
    .update({ plano: "trial", trial_termina_em: nova.toISOString().slice(0, 10) })
    .eq("id", clinicaId);

  if (error) return erro("Não foi possível esticar o teste.");

  revalidatePath(ROTA);
  redirect(ROTA);
}

// ------------------------------------------------------------------
// Parceiros
// ------------------------------------------------------------------

const parceiroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do parceiro."),
  codigo: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "O código precisa de ao menos 3 letras.")
    .max(40, "Código longo demais.")
    // Sem acento, espaço ou maiúscula: este texto vai numa URL e é ditado
    // por telefone. "joão silva" viraria "jo%C3%A3o%20silva" no link.
    .regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen."),
  telefone: z.string().trim().max(30),
  email: z.string().trim().max(160),
  comissao_percentual: z.string().trim(),
  meses_de_comissao: z.string().trim(),
  observacao: z.string().trim().max(300),
});

export async function salvarParceiro(id: string | null, formData: FormData) {
  const { admin } = await exigirDono();

  const r = parceiroSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    codigo: String(formData.get("codigo") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    comissao_percentual: String(formData.get("comissao_percentual") ?? "20"),
    meses_de_comissao: String(formData.get("meses_de_comissao") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  });
  if (!r.success) return erro(r.error.issues[0]?.message ?? "Verifique os campos.");

  const pct = Number(r.data.comissao_percentual.replace(",", "."));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return erro("A comissão precisa ser um percentual entre 0 e 100.");
  }
  const meses = r.data.meses_de_comissao ? Number(r.data.meses_de_comissao) : null;
  if (meses !== null && (!Number.isInteger(meses) || meses < 1)) {
    return erro("Os meses de comissão precisam ser um número inteiro maior que zero.");
  }

  const linha = {
    nome: r.data.nome,
    codigo: r.data.codigo,
    telefone: r.data.telefone || null,
    email: r.data.email || null,
    comissao_percentual: pct,
    meses_de_comissao: meses,
    observacao: r.data.observacao || null,
  };

  const { error } = id
    ? await admin.from("parceiro").update(linha).eq("id", id)
    : await admin.from("parceiro").insert(linha);

  if (error) {
    return erro(
      error.code === "23505"
        ? "Já existe um parceiro com esse código."
        : "Não foi possível salvar o parceiro."
    );
  }

  revalidatePath(ROTA);
  redirect(`${ROTA}?aba=parceiros`);
}

/**
 * Desliga o parceiro sem apagar.
 *
 * Apagar levaria junto o vínculo das clínicas que ele trouxe, e o histórico
 * de quem indicou quem é justamente o que resolve discussão de comissão.
 * Desligado, o link para de valer para cadastro novo e o passado fica.
 */
export async function alternarParceiro(id: string, ativo: boolean) {
  const { admin } = await exigirDono();

  const { error } = await admin.from("parceiro").update({ ativo: !ativo }).eq("id", id);
  if (error) return erro("Não foi possível mudar a situação do parceiro.");

  revalidatePath(ROTA);
  redirect(`${ROTA}?aba=parceiros`);
}
