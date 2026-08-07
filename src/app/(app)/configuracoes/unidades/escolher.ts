"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_UNIDADE, getSessao } from "@/lib/auth";

/**
 * Guarda em qual unidade a pessoa está trabalhando agora.
 *
 * A escolha é conferida contra as unidades que ela pode alcançar antes de
 * ir para o cookie. Cookie é editável pelo navegador: sem esta checagem,
 * trocar o valor à mão daria acesso ao caixa e ao estoque de outra filial.
 */
export async function escolherUnidade(id: string) {
  const { unidades } = await getSessao();
  if (!unidades.some((u) => u.id === id)) return;

  const armazem = await cookies();
  armazem.set(COOKIE_UNIDADE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
}
