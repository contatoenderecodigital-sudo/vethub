import { SlidersHorizontal } from "lucide-react";
import type { AgendamentoStatus, AgendamentoTipo, Usuario } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { hojeISOValidacao } from "@/lib/validacao";

/**
 * Peças compartilhadas pelas visões de calendário da agenda (mês e semana).
 *
 * REGRA DE FUSO: a clínica opera em America/Sao_Paulo (UTC-3 fixo, sem
 * horário de verão). Toda janela de consulta usa o sufixo `-03:00` e todo
 * Date construído a partir de "YYYY-MM-DD" usa `T12:00:00` (meio-dia local),
 * para o fuso do servidor nunca fazer a data "virar" de dia.
 */

/** Colunas do select das visões de calendário (mesmos joins nas duas telas). */
export const SELECT_CALENDARIO =
  "id, data_hora, tipo, status, " +
  "pet:pet_id (nome, especie), " +
  "veterinario:veterinario_id (nome)";

/** Um agendamento como o calendário precisa dele (leve: só o que aparece). */
export interface AgendamentoCalendario {
  id: string;
  data_hora: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  pet: { nome: string; especie: string } | null;
  veterinario: { nome: string } | null;
}

/**
 * Cor da pílula por situação do atendimento. Classes escritas por extenso
 * (nada de `bg-${cor}-300`) porque o Tailwind só gera o que encontra no
 * código-fonte.
 */
export const CORES_STATUS: Record<AgendamentoStatus, string> = {
  agendado: "bg-cyan-300/25 text-cyan-50 border-cyan-200/40",
  check_in: "bg-amber-300/25 text-amber-50 border-amber-200/40",
  atendido: "bg-violet-300/25 text-violet-50 border-violet-200/40",
  pronto: "bg-violet-300/25 text-violet-50 border-violet-200/40",
  check_out: "bg-emerald-300/25 text-emerald-50 border-emerald-200/40",
  cancelado: "bg-red-300/25 text-red-50 border-red-200/40 line-through",
};

export const DIAS_SEMANA_CURTO = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

/** Soma dias a uma data YYYY-MM-DD (T12:00:00 evita a virada de fuso). */
export function deslocarDia(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}

/** Soma meses a um mês YYYY-MM (contas em UTC, sem risco de fuso). */
export function deslocarMes(mes: string, meses: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + meses, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Mês de hoje (São Paulo) no formato YYYY-MM. */
export function mesDeHoje(): string {
  return hojeISOValidacao().slice(0, 7);
}

/** Sanitiza o parâmetro ?mes= da URL: formato/intervalo inválido → mês atual. */
export function mesParamOuAtual(v: string | undefined): string {
  if (!v || !/^\d{4}-\d{2}$/.test(v)) return mesDeHoje();
  const [ano, mes] = v.split("-").map(Number);
  if (mes < 1 || mes > 12) return mesDeHoje();
  if (ano < 2020 || ano > new Date().getFullYear() + 5) return mesDeHoje();
  return v;
}

/** Dia (YYYY-MM-DD) de um timestamp, sempre no relógio de São Paulo. */
export function diaDoTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

/** Minutos desde a meia-noite de São Paulo (para posicionar na grade). */
export function minutosDoDia(iso: string): number {
  const hhmm = new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Agrupa os agendamentos por dia local, mantendo a ordem que veio do banco. */
export function agruparPorDia<T extends { data_hora: string }>(
  lista: T[]
): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const a of lista) {
    const dia = diaDoTimestamp(a.data_hora);
    const atual = mapa.get(dia);
    if (atual) atual.push(a);
    else mapa.set(dia, [a]);
  }
  return mapa;
}

/** "agosto de 2026" → "Agosto de 2026". */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Dia por extenso do jeito que a tela mostra: "Sexta-feira, 4 de agosto". */
export function diaPorExtenso(data: string): string {
  return capitalizar(
    new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  );
}

/**
 * Filtro de veterinário (mesmo padrão da visão dia). Os `campos` viram
 * inputs escondidos para o GET não perder o período que está na tela.
 */
export function FiltroVeterinario({
  campos,
  vet,
  veterinarios,
}: {
  campos: Record<string, string>;
  vet?: string;
  veterinarios: Pick<Usuario, "id" | "nome">[];
}) {
  return (
    <form method="get" className="flex min-w-0 flex-wrap items-center gap-2">
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <Select
        name="vet"
        defaultValue={vet ?? ""}
        aria-label="Filtrar por veterinário"
        className="h-8 w-auto max-w-56 min-w-0 text-sm max-sm:min-h-11"
      >
        <option value="">Todos os veterinários</option>
        {veterinarios.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nome}
          </option>
        ))}
      </Select>
      <Button
        type="submit"
        variante="secondary"
        tamanho="sm"
        className="max-sm:min-h-11"
      >
        <SlidersHorizontal className="size-4" />
        Filtrar
      </Button>
    </form>
  );
}
