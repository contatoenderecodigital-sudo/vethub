import "server-only";

/**
 * Helpers de servidor para a integração WhatsApp Cloud API (Embedded Signup).
 * O token da Meta NUNCA passa pelo navegador: fica em whatsapp_conexao,
 * tabela sem policies de RLS (acesso só via service_role).
 */

export const GRAPH_VERSAO = "v23.0";
export const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSAO}`;

/** Envs do app Meta configuradas? (Embedded Signup só funciona com elas) */
export function metaConfigurada() {
  return Boolean(
    process.env.NEXT_PUBLIC_META_APP_ID &&
      process.env.NEXT_PUBLIC_META_ES_CONFIG_ID &&
      process.env.META_APP_SECRET
  );
}

export interface ConexaoWhatsapp {
  id: string;
  clinica_id: string;
  waba_id: string;
  phone_number_id: string;
  numero_exibicao: string | null;
  nome_verificado: string | null;
  status: "conectado" | "desconectado" | "erro";
  conectado_em: string;
}

/** Troca o code retornado pelo Embedded Signup por um business token. */
export async function trocarCodePorToken(code: string): Promise<string | null> {
  const url =
    `${GRAPH_URL}/oauth/access_token` +
    `?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&code=${encodeURIComponent(code)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const corpo = (await res.json()) as { access_token?: string };
  return corpo.access_token ?? null;
}

/** Inscreve o app nos webhooks da WABA (obrigatório para receber eventos). */
export async function inscreverAppNaWaba(wabaId: string, token: string) {
  const res = await fetch(`${GRAPH_URL}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.ok;
}

/** Busca número formatado e nome verificado do telefone conectado. */
export async function detalhesDoNumero(phoneNumberId: string, token: string) {
  const res = await fetch(
    `${GRAPH_URL}/${phoneNumberId}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) return null;
  return (await res.json()) as {
    display_phone_number?: string;
    verified_name?: string;
  };
}
