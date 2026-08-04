import { Badge } from "@/components/ui/badge";
import { ROTULO_TIPO_RECEITA, type ReceitaTipo } from "@/lib/types";

// Controlada chama atenção (duas vias, controle especial); manipulada é informativa.
const TOM: Record<ReceitaTipo, "neutro" | "danger" | "info"> = {
  simples: "neutro",
  controlada: "danger",
  manipulada: "info",
};

export function BadgeTipoReceita({ tipo }: { tipo: ReceitaTipo }) {
  return <Badge tom={TOM[tipo]}>{ROTULO_TIPO_RECEITA[tipo]}</Badge>;
}
