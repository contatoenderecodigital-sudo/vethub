"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgendamentoStatus } from "@/lib/types";
import { avancarEtapa } from "./actions";

/**
 * Botão que empurra o atendimento para a próxima etapa do fluxo.
 * A action devolve { erro } (não redireciona) porque quem chama é client:
 * assim o painel só atualiza a lista com router.refresh().
 */
export function BotaoEtapa({
  agendamentoId,
  proximo,
  rotulo,
  variante = "primary",
  className = "",
}: {
  agendamentoId: string;
  proximo: AgendamentoStatus;
  rotulo: string;
  variante?: "primary" | "secondary";
  className?: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const router = useRouter();

  function avancar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await avancarEtapa(agendamentoId, proximo);
      if (resultado?.erro) setErro(resultado.erro);
      else router.refresh();
    });
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <Button
        type="button"
        variante={variante}
        tamanho="sm"
        disabled={pendente}
        onClick={avancar}
        className="min-h-11 w-full"
      >
        {pendente ? "Salvando…" : rotulo}
        {!pendente && <ChevronRight className="size-4" aria-hidden />}
      </Button>
      {erro && (
        <p
          role="alert"
          className="mt-1 rounded-lg border border-red-300/40 bg-red-400/30 px-2 py-1 text-xs font-medium text-red-50"
        >
          {erro}
        </p>
      )}
    </div>
  );
}
