import { ROTULO_STATUS_ASSINATURA, type AssinaturaStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const TOM: Record<AssinaturaStatus, "success" | "pending" | "neutro"> = {
  ativa: "success",
  suspensa: "pending",
  cancelada: "neutro",
};

export function BadgeAssinatura({ status }: { status: AssinaturaStatus }) {
  return <Badge tom={TOM[status]}>{ROTULO_STATUS_ASSINATURA[status]}</Badge>;
}
