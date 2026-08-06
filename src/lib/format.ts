import type { AgendamentoStatus, AgendamentoTipo, OrcamentoStatus } from "./types";

export function formatBRL(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? parseFloat(valor) : valor ?? 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTelefone(tel: string | null | undefined): string {
  if (!tel) return "—";
  let d = tel.replace(/\D/g, "");
  // números guardados com DDI 55 (padrão do banco, pronto p/ WhatsApp)
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

export function idadeDoPet(nascimento: string | null | undefined): string {
  if (!nascimento) return "—";
  const nasc = new Date(nascimento + "T12:00:00");
  const agora = new Date();
  let meses =
    (agora.getFullYear() - nasc.getFullYear()) * 12 +
    (agora.getMonth() - nasc.getMonth());
  if (agora.getDate() < nasc.getDate()) meses -= 1;
  if (meses < 0) return "—";
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto > 0 ? `${anos} a ${resto} m` : `${anos} ${anos === 1 ? "ano" : "anos"}`;
}

/**
 * Idade completa do jeito que a clínica fala: "2 anos, 3 meses e 16 dias".
 * Contas em cima do calendário (não em milissegundos) para não escorregar
 * com meses de tamanhos diferentes nem com horário de verão.
 */
export function idadeDetalhada(nascimento: string | null | undefined): string {
  if (!nascimento || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return "—";

  const [anoN, mesN, diaN] = nascimento.split("-").map(Number);
  const [anoH, mesH, diaH] = hojeISO().split("-").map(Number);

  let anos = anoH - anoN;
  let meses = mesH - mesN;
  let dias = diaH - diaN;

  if (dias < 0) {
    meses -= 1;
    // dia 0 do mês de hoje = último dia do mês anterior
    dias += new Date(Date.UTC(anoH, mesH - 1, 0)).getUTCDate();
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }
  if (anos < 0) return "—";

  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? "ano" : "anos"}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? "mês" : "meses"}`);
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? "dia" : "dias"}`);

  if (partes.length === 0) return "Menos de 1 dia";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

/** Peso em quilos no padrão pt-BR: 4,5 kg · 40 kg. */
export function formatPeso(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

/**
 * Data pura (coluna `date`, sem hora) → DD/MM/YYYY.
 * Não passa por fuso: "2025-09-18" viraria 17/09 se convertido de UTC
 * para America/Sao_Paulo.
 */
export function formatDataISO(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : formatData(iso);
}

/**
 * Dias inteiros de hoje (São Paulo) até a data informada.
 * Negativo = já passou. Usado nos avisos de reforço de vacina.
 */
export function diasAte(iso: string | null | undefined): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const [ah, mh, dh] = hojeISO().split("-").map(Number);
  const alvo = Date.UTC(a, m - 1, d);
  const hoje = Date.UTC(ah, mh - 1, dh);
  return Math.round((alvo - hoje) / 86_400_000);
}

export const ROTULO_TIPO: Record<AgendamentoTipo, string> = {
  consulta: "Consulta",
  retorno: "Retorno",
  banho_tosa: "Banho e tosa",
  cirurgia: "Cirurgia",
};

export const ROTULO_STATUS_AGENDAMENTO: Record<AgendamentoStatus, string> = {
  agendado: "Agendado",
  check_in: "Check-in",
  atendido: "Atendido",
  pronto: "Pronto",
  check_out: "Check-out",
  cancelado: "Cancelado",
};

export const ROTULO_STATUS_ORCAMENTO: Record<OrcamentoStatus, string> = {
  aberto: "Aberto",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

/** Data de hoje em São Paulo no formato YYYY-MM-DD (para inputs e filtros). */
export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Monta o endereço em uma linha a partir dos campos estruturados. */
export function formatEndereco(e: {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}): string {
  const ruaNumero = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const comComplemento = [ruaNumero, e.complemento].filter(Boolean).join(" – ");
  const cidadeUf = [e.cidade, e.uf].filter(Boolean).join("/");
  const cep =
    e.cep && e.cep.length === 8 ? `CEP ${e.cep.slice(0, 5)}-${e.cep.slice(5)}` : null;
  const partes = [comComplemento, e.bairro, cidadeUf, cep].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

/**
 * Concordância de número: `plural(1, "lote")` → "1 lote".
 *
 * O sistema estava cheio de "1 lotes", "1 itens", "1 cadastrados". Numa tela
 * de gestão isso passa a impressão de software mal-acabado, e é o tipo de
 * coisa que o cliente repara antes de reparar no que funciona bem.
 *
 * O plural irregular vai explícito quando o "s" não resolve:
 *   plural(2, "unidade")            → "2 unidades"
 *   plural(1, "item", "itens")      → "1 item"
 */
export function plural(
  quantidade: number,
  singular: string,
  formaPlural?: string
): string {
  const palavra =
    quantidade === 1 ? singular : (formaPlural ?? `${singular}s`);
  return `${quantidade} ${palavra}`;
}
