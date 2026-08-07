"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoData } from "@/components/ui/campo-data";

/**
 * Navegação por data das telas que mostram um período.
 *
 * Antes eram três botões: anterior, "Hoje" e próximo. Para ver a agenda de uma
 * terça-feira do mês que vem era preciso clicar vinte vezes na seta, e não
 * havia jeito nenhum de ir direto a uma data. O campo do meio é o mesmo
 * `CampoData` do resto do sistema: dá para digitar `15092026` ou abrir o
 * calendário e escolher.
 *
 * As setas continuam, porque "o dia seguinte" é o movimento mais comum do
 * balcão e um clique é melhor que abrir calendário para isso.
 */
export type PassoData = "dia" | "semana" | "mes";

export function NavegadorData({
  data,
  hoje,
  rota,
  vet,
  passo = "dia",
  rotulo = "Escolher a data",
}: {
  /** Dia em foco, em ISO (YYYY-MM-DD). */
  data: string;
  /** Hoje em ISO, calculado no servidor para não depender do relógio do PC. */
  hoje: string;
  /**
   * Rota da tela (`/agenda`, `/agenda/semana`, `/banho-tosa`…). A URL é
   * montada AQUI e não recebida pronta: função não atravessa a fronteira
   * entre Server e Client Component, e passar uma faz o bloco sumir da
   * página sem erro visível.
   */
  rota: string;
  /** Filtro de veterinário a preservar ao trocar de data. */
  vet?: string;
  /** De quanto anda cada seta, e por qual parâmetro a tela navega. */
  passo?: PassoData;
  rotulo?: string;
}) {
  const router = useRouter();

  /** Anda no calendário sem escorregar no fuso (meio-dia como referência). */
  function deslocar(sentido: 1 | -1) {
    const d = new Date(`${data}T12:00:00`);
    if (passo === "mes") d.setMonth(d.getMonth() + sentido);
    else d.setDate(d.getDate() + sentido * (passo === "semana" ? 7 : 1));
    return d.toLocaleDateString("en-CA");
  }

  const irPara = (iso: string) => {
    if (!iso || iso === data) return;
    // A visão de mês navega por `?mes=YYYY-MM`; as outras pelo dia cheio.
    const chave = passo === "mes" ? `mes=${iso.slice(0, 7)}` : `data=${iso}`;
    router.push(`${rota}?${chave}${vet ? `&vet=${vet}` : ""}`);
  };

  const mesmoPeriodo =
    passo === "mes" ? data.slice(0, 7) === hoje.slice(0, 7) : data === hoje;

  return (
    <div className="flex items-center gap-2 max-sm:w-full">
      <Button
        type="button"
        variante="secondary"
        tamanho="sm"
        aria-label={passo === "mes" ? "Mês anterior" : passo === "semana" ? "Semana anterior" : "Dia anterior"}
        onClick={() => irPara(deslocar(-1))}
        className="shrink-0 max-sm:min-h-11 max-sm:min-w-11"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {/* `key` na data: ao trocar de rota o campo remonta com o valor novo em
          vez de guardar o antigo no estado interno. */}
      <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
        <CampoData key={data} value={data} onChange={irPara} required aria-label={rotulo} />
      </div>

      <Button
        type="button"
        variante="secondary"
        tamanho="sm"
        aria-label={passo === "mes" ? "Próximo mês" : passo === "semana" ? "Próxima semana" : "Próximo dia"}
        onClick={() => irPara(deslocar(1))}
        className="shrink-0 max-sm:min-h-11 max-sm:min-w-11"
      >
        <ChevronRight className="size-4" />
      </Button>

      {/* "Hoje" só aparece quando adianta alguma coisa. */}
      {!mesmoPeriodo && (
        <Button
          type="button"
          variante="secondary"
          tamanho="sm"
          onClick={() => irPara(hoje)}
          className="shrink-0 max-sm:min-h-11"
        >
          Hoje
        </Button>
      )}
    </div>
  );
}
