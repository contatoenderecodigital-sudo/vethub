import { TriangleAlert } from "lucide-react";
import { formatDataHora, hojeISO } from "@/lib/format";

/**
 * Aviso de caixa aberto de um dia para o outro.
 *
 * Caixa esquecido aberto não é detalhe: ele mistura o movimento de dois dias
 * ou mais, e a conferência de fechamento passa a comparar a gaveta de hoje
 * com as vendas de ontem junto. O relatório não acusa nada — ele só passa a
 * mentir em silêncio, e quando alguém percebe já não dá para separar.
 *
 * O sistema não fecha sozinho de propósito: o dinheiro físico precisa ser
 * conferido por uma pessoa. Mas avisar é obrigação.
 */
export function AvisoCaixaAntigo({ abertura }: { abertura: string }) {
  // Compara o DIA, não as 24 horas: caixa aberto às 22h de ontem e conferido
  // às 8h de hoje tem 10 horas de vida, mas já misturou dois dias.
  const diaDaAbertura = new Date(abertura).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  if (diaDaAbertura >= hojeISO()) return null;

  const dias = Math.round(
    (new Date(`${hojeISO()}T12:00:00`).getTime() -
      new Date(`${diaDaAbertura}T12:00:00`).getTime()) /
      86400000
  );

  return (
    <p
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200/60 bg-amber-300/25 px-3 py-2.5 text-sm font-medium text-amber-50"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
      <span>
        Este caixa está aberto desde {formatDataHora(abertura)}
        {dias === 1 ? " (ontem)" : `, há ${dias} dias`}. O movimento de mais
        de um dia está somando no mesmo turno, e a conferência do fechamento
        vai comparar a gaveta de hoje com as vendas de todos esses dias.
        Feche o caixa e abra um novo.
      </span>
    </p>
  );
}
