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
  const d = tel.replace(/\D/g, "");
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

export function emojiEspecie(especie: string | null | undefined): string {
  switch ((especie ?? "").toLowerCase()) {
    case "cachorro":
      return "🐶";
    case "gato":
      return "🐱";
    case "ave":
      return "🦜";
    case "réptil":
    case "reptil":
      return "🦎";
    case "roedor":
      return "🐹";
    case "coelho":
      return "🐰";
    default:
      return "🐾";
  }
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
