import { Badge } from "@/components/ui/badge";
import { ROTULO_STATUS_COMPRA, type CompraStatus } from "@/lib/types";

const TOM: Record<CompraStatus, "pending" | "success" | "danger"> = {
  pendente: "pending",
  recebida: "success",
  cancelada: "danger",
};

/** Selo de status da compra: usado na lista, no detalhe e na ficha do fornecedor. */
export function BadgeCompra({ status }: { status: CompraStatus }) {
  return <Badge tom={TOM[status]}>{ROTULO_STATUS_COMPRA[status]}</Badge>;
}
