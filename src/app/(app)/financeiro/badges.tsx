import { diasAte, formatDataISO } from "@/lib/format";
import { ROTULO_STATUS_CONTA, type ContaStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

/** Cores do status da conta no mesmo vocabulário visual do resto do sistema. */
const TOM_STATUS: Record<
  ContaStatus,
  "success" | "pending" | "danger" | "neutro"
> = {
  aberta: "neutro",
  parcial: "pending",
  paga: "success",
  cancelada: "danger",
};

export function BadgeStatusConta({ status }: { status: ContaStatus }) {
  return <Badge tom={TOM_STATUS[status]}>{ROTULO_STATUS_CONTA[status]}</Badge>;
}

/** Texto de "vencida há X dias" no plural certo. */
function textoDias(dias: number): string {
  const n = Math.abs(dias);
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/**
 * Vencimento com aviso: vermelho quando já passou, âmbar no dia, e a contagem
 * regressiva nos demais casos. Conta paga ou cancelada não tem urgência.
 */
export function BadgeVencimento({
  vencimento,
  status,
}: {
  vencimento: string;
  status: ContaStatus;
}) {
  const data = formatDataISO(vencimento);

  if (status === "paga" || status === "cancelada") {
    return <span className="text-sm text-ink-muted tabular-nums">{data}</span>;
  }

  const dias = diasAte(vencimento);

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-ink tabular-nums">{data}</span>
      {dias === null ? null : dias < 0 ? (
        <Badge tom="danger">Vencida há {textoDias(dias)}</Badge>
      ) : dias === 0 ? (
        <Badge tom="pending">Vence hoje</Badge>
      ) : (
        <span className="text-xs text-ink-muted">em {textoDias(dias)}</span>
      )}
    </span>
  );
}
