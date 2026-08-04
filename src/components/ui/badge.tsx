import type { AgendamentoStatus, OrcamentoStatus } from "@/lib/types";
import {
  ROTULO_STATUS_AGENDAMENTO,
  ROTULO_STATUS_ORCAMENTO,
} from "@/lib/format";

type Tom = "success" | "pending" | "danger" | "info" | "neutro" | "brand";

const TONS: Record<Tom, string> = {
  success: "bg-success/10 text-success",
  pending: "bg-pending/10 text-amber-700",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  neutro: "bg-zinc-100 text-ink-muted",
  brand: "bg-brand/10 text-brand-dark",
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
