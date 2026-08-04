import { ROTULO_STATUS_VENDA, type VendaStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const TOM: Record<VendaStatus, "success" | "pending" | "danger"> = {
  paga: "success",
  aberta: "pending",
  cancelada: "danger",
};

export function BadgeVenda({ status }: { status: VendaStatus }) {
  return <Badge tom={TOM[status]}>{ROTULO_STATUS_VENDA[status]}</Badge>;
}
