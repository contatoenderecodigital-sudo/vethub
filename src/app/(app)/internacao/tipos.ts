// Tipos e helpers do módulo de Internação (Fase 3).
// Ficam locais ao módulo para não mexer nos tipos da Fase 1.

export type InternacaoStatus = "internado" | "alta" | "obito";

export type AdministracaoStatus =
  | "pendente"
  | "aplicado"
  | "atrasado"
  | "suspenso";

export const ROTULO_STATUS_INTERNACAO: Record<InternacaoStatus, string> = {
  internado: "Internado",
  alta: "Alta",
  obito: "Óbito",
};

/** Vias de administração mais usadas na rotina de internação. */
export const VIAS = ["Oral", "IV", "IM", "SC", "Tópica", "Inalatória"] as const;

export interface PetResumo {
  id: string;
  nome: string;
  especie: string;
  foto_url: string | null;
  tutor: { id: string; nome: string } | null;
}

export interface InternacaoLinha {
  id: string;
  box: string | null;
  data_entrada: string;
  data_saida: string | null;
  motivo: string;
  status: InternacaoStatus;
  pet: PetResumo | null;
  veterinario: { id: string; nome: string } | null;
}

export interface InternacaoDetalhe extends InternacaoLinha {
  clinica_id: string;
  pet_id: string;
  veterinario_id: string | null;
  diagnostico: string | null;
  observacoes: string | null;
}

export interface PrescricaoLinha {
  id: string;
  medicamento: string;
  dose: string;
  via: string | null;
  frequencia_horas: number | null;
  horarios: string[] | null;
  inicio: string;
  fim: string | null;
  observacao: string | null;
  created_at: string;
  prescritor: { nome: string } | null;
}

export interface AdministracaoLinha {
  id: string;
  horario_previsto: string;
  horario_realizado: string | null;
  status: AdministracaoStatus;
  observacao: string | null;
  prescricao: {
    id: string;
    medicamento: string;
    dose: string;
    via: string | null;
  } | null;
  responsavel: { nome: string } | null;
}

export interface EvolucaoLinha {
  id: string;
  data_hora: string;
  texto: string;
  temperatura: number | null;
  frequencia_cardiaca: number | null;
  frequencia_respiratoria: number | null;
  responsavel: { nome: string } | null;
}

// ------------------------------------------------------------------
// Helpers de data — a clínica opera em America/Sao_Paulo (UTC-3 fixo),
// o mesmo offset usado no resto do projeto.
// ------------------------------------------------------------------

/** Data (YYYY-MM-DD) de um timestamp no fuso da clínica. */
export function dataSPde(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

/** Hora (HH:MM) de um timestamp no fuso da clínica. */
export function horaSPde(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Soma dias a uma data YYYY-MM-DD (sem tropeçar em fuso). */
export function somarDias(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Dias completos de internação (até a saída, ou até agora se ainda internado). */
export function diasInternado(entrada: string, saida: string | null): number {
  const fim = saida ? new Date(saida).getTime() : Date.now();
  const ms = fim - new Date(entrada).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** "Hoje", "1 dia", "5 dias" — texto curto para o cartão do paciente. */
export function rotuloDiasInternado(entrada: string, saida: string | null): string {
  const dias = diasInternado(entrada, saida);
  if (dias === 0) return "Hoje";
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

/** A medicação já passou da hora e continua sem registro de aplicação? */
export function estaAtrasada(
  horarioPrevisto: string,
  status: AdministracaoStatus
): boolean {
  if (status === "aplicado" || status === "suspenso") return false;
  return new Date(horarioPrevisto).getTime() < new Date().getTime();
}

/** "08:00:00" (time do Postgres) → "08:00" */
export function horaCurta(hora: string): string {
  return hora.slice(0, 5);
}
