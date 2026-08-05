import Link from "next/link";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Campo } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { atalhosPeriodo, type Periodo } from "./definicoes";

/** Monta uma URL do relatório preservando os filtros atuais. */
export function urlDoRelatorio(
  base: string,
  params: Record<string, string | undefined>,
  troca: Record<string, string | undefined> = {}
): string {
  const sp = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...params, ...troca })) {
    if (valor) sp.set(chave, valor);
  }
  const query = sp.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Barra de filtros padrão dos relatórios: período com atalhos + os filtros
 * extras de cada relatório (children) + botão "Gerar".
 *
 * Tudo é `<form method="get">`: o estado mora na URL, então o relatório é
 * um link que a clínica pode salvar, mandar para o contador ou imprimir.
 * Some do papel (`print:hidden`).
 */
export function FiltrosRelatorio({
  base,
  periodo,
  params,
  children,
  semPeriodo = false,
  rotuloDe = "De",
  rotuloAte = "Até",
}: {
  base: string;
  periodo?: Periodo;
  /** Filtros atuais da URL — mantêm-se ao clicar num atalho de período. */
  params: Record<string, string | undefined>;
  children?: ReactNode;
  /** Relatórios de posição (estoque, vacinas) não usam janela de datas. */
  semPeriodo?: boolean;
  rotuloDe?: string;
  rotuloAte?: string;
}) {
  const atalhos = semPeriodo ? [] : atalhosPeriodo();
  const temFiltro = Object.values(params).some(Boolean);

  return (
    <form
      method="get"
      action={base}
      className="glass mb-4 rounded-2xl p-3 sm:p-4 print:hidden"
    >
      {!semPeriodo && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium tracking-wide text-ink-muted uppercase">
            Período
          </span>
          {atalhos.map((atalho) => {
            const ativo = periodo?.de === atalho.de && periodo?.ate === atalho.ate;
            return (
              <Link
                key={atalho.rotulo}
                href={urlDoRelatorio(base, params, {
                  de: atalho.de,
                  ate: atalho.ate,
                })}
                aria-current={ativo ? "page" : undefined}
                className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors ${
                  ativo
                    ? "bg-white text-brand-dark shadow-sm"
                    : "border border-white/40 bg-white/15 text-ink-muted hover:bg-white/25 hover:text-white"
                }`}
              >
                {atalho.rotulo}
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        {!semPeriodo && periodo && (
          <>
            <div className="min-w-32 flex-1">
              <Campo rotulo={rotuloDe} htmlFor="de">
                <CampoData
                  id="de"
                  name="de"
                  min="2015-01-01"
                  max="2099-12-31"
                  defaultValue={periodo.de}
                />
              </Campo>
            </div>
            <div className="min-w-32 flex-1">
              <Campo rotulo={rotuloAte} htmlFor="ate">
                <CampoData
                  id="ate"
                  name="ate"
                  min="2015-01-01"
                  max="2099-12-31"
                  defaultValue={periodo.ate}
                />
              </Campo>
            </div>
          </>
        )}

        {children}

        <div className="flex shrink-0 gap-2">
          <button
            type="submit"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-dark shadow-lg shadow-black/10 transition-colors hover:bg-white/90"
          >
            <Search className="size-4" aria-hidden />
            Gerar
          </button>
          {temFiltro && (
            <Link
              href={base}
              className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-white/15 hover:text-white"
            >
              Limpar
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}
