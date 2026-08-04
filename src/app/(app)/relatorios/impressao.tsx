import type { ReactNode } from "react";
import { ChartColumn } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BotaoImprimir } from "./botao-imprimir";

/**
 * CSS de impressão do módulo. Não existe rota de impressão: a própria
 * página vira papel — o vidro fica branco, o texto fica preto e filtros,
 * navegação e botões somem.
 */
const CSS_IMPRESSAO = `
@page { size: A4 landscape; margin: 10mm; }
@media print {
  html, body { background: #ffffff !important; }
  body::before { display: none !important; }
  /* navegação do app não vai para o papel */
  header, aside, nav { display: none !important; }
  main { padding: 0 !important; }
  main > div { max-width: none !important; }

  .relatorio-folha, .relatorio-folha * {
    color: #18181b !important;
    text-shadow: none !important;
  }
  .relatorio-folha .glass,
  .relatorio-folha .glass-forte {
    background: #ffffff !important;
    border-color: #d4d4d8 !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
  .relatorio-folha table { border-collapse: collapse; width: 100%; }
  .relatorio-folha thead { display: table-header-group; }
  .relatorio-folha tr { break-inside: avoid; }
  .relatorio-folha th, .relatorio-folha td {
    border-bottom: 1px solid #d4d4d8 !important;
    background: transparent !important;
  }
  .relatorio-folha tfoot td { border-top: 2px solid #18181b !important; }
  .relatorio-folha [class*="overflow"] { overflow: visible !important; }
  .relatorio-folha table { min-width: 0 !important; }
}
`;

/**
 * Casca de todo relatório: cabeçalho de tela (com o botão Imprimir),
 * cabeçalho que só aparece no papel e o conteúdo.
 */
export function FolhaRelatorio({
  titulo,
  subtitulo,
  clinica,
  periodo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  clinica: string;
  /** Texto do período impresso no cabeçalho do papel. */
  periodo: string;
  children: ReactNode;
}) {
  const emitidoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relatorio-folha print:bg-white print:text-black">
      <style>{CSS_IMPRESSAO}</style>

      <div className="print:hidden">
        <PageHeader
          titulo={titulo}
          subtitulo={subtitulo}
          acao={
            <>
              <ButtonLink href="/relatorios" variante="ghost">
                <ChartColumn className="size-4" aria-hidden />
                Relatórios
              </ButtonLink>
              <BotaoImprimir />
            </>
          }
        />
      </div>

      {/* Só no papel: identifica a clínica, o relatório e o período. */}
      <div className="hidden print:block">
        <div className="mb-4 border-b-2 border-zinc-900 pb-2">
          <p className="text-base font-bold uppercase tracking-wide">{clinica}</p>
          <p className="text-sm font-semibold">{titulo}</p>
          <p className="text-[11px]">
            {periodo} · Emitido em {emitidoEm}
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}
