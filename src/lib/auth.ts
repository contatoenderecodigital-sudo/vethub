import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types";
import { temRecurso, type Recurso } from "@/lib/plano-conta";

/** Cookie com a unidade escolhida no cabeçalho. */
export const COOKIE_UNIDADE = "vethub_unidade";

export interface UnidadeSessao {
  id: string;
  nome: string;
  principal: boolean;
}

/**
 * O plano que a clínica paga ao VetHub.
 *
 * Não confundir com a tabela `plano`, que é o plano de saúde vendido ao
 * tutor. Ver `src/lib/plano-conta.ts`.
 */
export interface ContaDaClinica {
  plano: string;
  ciclo: string;
  trial_termina_em: string | null;
  renova_em: string | null;
  limite_usuarios: number | null;
}

/**
 * Carrega o usuário logado + perfil (com clinica_id) em código de servidor.
 * Redireciona para /login se não houver sessão válida.
 *
 * Envolvida em `cache()`: numa única requisição, o layout do app, o layout
 * que confere o plano e a própria página chamam esta função — sem a memória,
 * seriam três idas ao banco para buscar exatamente a mesma linha. O `cache`
 * do React vale só dentro de uma requisição, então dois usuários nunca
 * enxergam a sessão um do outro.
 *
 * Traz também a UNIDADE em que a pessoa está trabalhando agora, e as que ela
 * pode alcançar. Quem está preso a uma unidade só enxerga aquela; quem não
 * está (dono, gerente) escolhe no cabeçalho e a escolha vive num cookie.
 *
 * A escolha é sempre conferida contra a lista de unidades permitidas — um
 * cookie é editável pelo usuário, e sem essa checagem daria para espiar o
 * caixa de outra filial trocando um valor no navegador.
 */
export const getSessao = cache(async function getSessao() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("id, clinica_id, nome, email, papel, unidade_id")
    .eq("id", user.id)
    .single<Usuario & { unidade_id: string | null }>();

  if (!usuario) redirect("/login");

  // A clínica vem junto das unidades, na mesma ida ao banco: o plano é
  // consultado em toda página (o menu precisa saber onde pôr cadeado), e
  // uma consulta separada por tela sairia cara para um dado que muda uma
  // vez por mês.
  const [{ data: todas }, { data: clinica }] = await Promise.all([
    supabase
      .from("unidade")
      .select("id, nome, principal")
      .eq("ativa", true)
      .order("principal", { ascending: false })
      .order("nome")
      .returns<UnidadeSessao[]>(),
    supabase
      .from("clinica")
      .select("plano, ciclo, trial_termina_em, renova_em, limite_usuarios")
      .eq("id", usuario.clinica_id)
      .single<ContaDaClinica>(),
  ]);

  const disponiveis = (todas ?? []).filter(
    (u) => !usuario.unidade_id || u.id === usuario.unidade_id
  );

  const escolhida = (await cookies()).get(COOKIE_UNIDADE)?.value;
  const unidade =
    disponiveis.find((u) => u.id === escolhida) ??
    disponiveis.find((u) => u.principal) ??
    disponiveis[0] ??
    null;

  // Clínica sem linha legível (não deveria acontecer) cai no teste, que é o
  // estado mais restrito que não quebra nada: melhor uma tela pedindo
  // upgrade do que o sistema inteiro fora do ar por um select que falhou.
  const conta: ContaDaClinica = clinica ?? {
    plano: "trial",
    ciclo: "mensal",
    trial_termina_em: null,
    renova_em: null,
    limite_usuarios: null,
  };

  return { supabase, usuario, unidade, unidades: disponiveis, conta };
});

/**
 * Barra a página quando o plano da conta não inclui o recurso.
 *
 * O menu já mostra cadeado nesses itens, mas o cadeado é para VENDER, não
 * para proteger: quem copiar um endereço de um vídeo ou de uma demonstração
 * chega na tela do mesmo jeito. Esta é a barreira de verdade, e por isso ela
 * mora no servidor — o navegador não tem como pular.
 *
 * Manda para a tela de upgrade em vez de dar erro: quem chegou aqui estava
 * procurando exatamente esse recurso.
 */
export async function exigirRecurso(recurso: Recurso) {
  const sessao = await getSessao();
  if (!temRecurso(sessao.conta.plano, recurso)) {
    redirect(`/assinatura/recurso/${recurso}`);
  }
  return sessao;
}
