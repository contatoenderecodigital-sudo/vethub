import type { AgendamentoStatus, OrcamentoStatus } from "@/lib/types";
import {
  ROTULO_STATUS_AGENDAMENTO,
  ROTULO_STATUS_ORCAMENTO,
} from "@/lib/format";

type Tom = "success" | "pending" | "danger" | "info" | "neutro" | "brand";

// Tons claros para leitura sobre o vidro no degradê verde.
//
// O véu escuro que dá contraste a estes fundos translúcidos está no
// globals.css, junto com o das outras superfícies: aqui uma classe arbitrária
// de background brigaria com o tom colorido e, pior, não seria desfeita no
// modo claro — que reescreve estas classes pelo nome.
const TONS: Record<Tom, string> = {
  success: "bg-emerald-300/25 text-emerald-50",
  pending: "bg-amber-300/30 text-amber-50",
  danger: "bg-red-400/30 text-red-50",
  info: "bg-cyan-300/25 text-cyan-50",
  neutro: "bg-white/20 text-white",
  brand: "bg-white/25 text-white",
};

export function Badge({
  tom = "neutro",
  children,
  className = "",
}: {
  tom?: Tom;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONS[tom]} ${className}`}
    >
      {children}
    </span>
  );
}

const TOM_AGENDAMENTO: Record<AgendamentoStatus, Tom> = {
  agendado: "info",
  check_in: "pending",
  atendido: "brand",
  pronto: "brand",
  check_out: "success",
  cancelado: "danger",
};

export function BadgeAgendamento({ status }: { status: AgendamentoStatus }) {
  return <Badge tom={TOM_AGENDAMENTO[status]}>{ROTULO_STATUS_AGENDAMENTO[status]}</Badge>;
}

const TOM_ORCAMENTO: Record<OrcamentoStatus, Tom> = {
  aberto: "pending",
  aprovado: "success",
  recusado: "danger",
};

export function BadgeOrcamento({ status }: { status: OrcamentoStatus }) {
  return <Badge tom={TOM_ORCAMENTO[status]}>{ROTULO_STATUS_ORCAMENTO[status]}</Badge>;
}
