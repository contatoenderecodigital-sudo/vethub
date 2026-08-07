"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoData } from "@/components/ui/campo-data";

/**
 * Navegação por data da agenda.
 *
 * Antes eram três botões: anterior, "Hoje" e próximo. Para ver a agenda de
 * uma terça-feira do mês que vem era preciso clicar vinte vezes na seta — e
 * não havia jeito nenhum de ir direto a uma data. O campo do meio agora é o
 * mesmo `CampoData` do resto do sistema: dá para digitar `15032026` ou abrir
 * o calendário e escolher.
 *
 * As setas continuam, porque "o dia seguinte" é o movimento mais comum do
 * balcão e um clique é melhor que abrir calendário para isso.
 */
export function NavegadorData({
  data,
  hoje,
  rota,
  vet,
  porMes = false,
}: {
  /** Dia em foco, em ISO (YYYY-MM-DD). */
  data: string;
  /** Hoje em ISO, calculado no servidor para não depender do relógio do PC. */
  hoje: string;
  /**
   * Rota da visão (`/agenda`, `/agenda/semana`…). A URL é montada AQUI e não
   * recebida pronta: passar uma função de um Server Component para um Client
   * Component não funciona — funções não atravessam a fronteira.
   */
  rota: string;
  /** Filtro de veterinário a preservar ao trocar de dia. */
  vet?: string;
  /** A visão Mês navega por `?mes=YYYY-MM`; as outras por `?data=`. */
  porMes?: boolean;
}) {
  const router = useRouter();

  /** Soma dias sem escorregar no fuso (meio-dia local como referência). */
  function deslocar(dias: number) {
    const d = new Date(`${data}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toLocaleDateString("en-CA");
  }

  const irPara = (iso: string) => {
    if (!iso || iso === data) return;
    const chave = porMes ? `mes=${iso.slice(0, 7)}` : `data=${iso}`;
    router.push(`${rota}?${chave}${vet ? `&vet=${vet}` : ""}`);
  };

  return (
    <div className="flex items-center gap-2 max-sm:w-full">
      <Button
        type="button"
        variante="secondary"
        tamanho="sm"
        aria-label="Dia anterior"
        onClick={() => irPara(deslocar(-1))}
        className="shrink-0 max-sm:min-h-11 max-sm:min-w-11"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {/* `key` na data: quando a navegação troca a rota, o campo remonta com
          o valor novo em vez de guardar o antigo no estado interno. */}
      <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
        <CampoData
          key={data}
          value={data}
          onChange={irPara}
          required
          aria-label="Escolher a data da agenda"
        />
      </div>

      <Button
        type="button"
        variante="secondary"
        tamanho="sm"
        aria-label="Próximo dia"
        onClick={() => irPara(deslocar(1))}
        className="shrink-0 max-sm:min-h-11 max-sm:min-w-11"
      >
        <ChevronRight className="size-4" />
      </Button>

      {data !== hoje && (
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
