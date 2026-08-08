import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { temRecurso } from "@/lib/plano-conta";
import { AREAS, RELATORIOS } from "./definicoes";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const { usuario, conta } = await getSessao();
  // Recepção opera a clínica, mas não vê o dinheiro dela.
  const podeFinanceiro = usuario.papel !== "recepcao";
  const visiveis = RELATORIOS.filter((r) => podeFinanceiro || !r.financeiro);

  // Os relatórios completos continuam listados sem o recurso, com cadeado:
  // a lista É o catálogo, e sumir com quatro cartões faria a clínica achar
  // que o sistema não tem relatório de faturamento.
  const AVANCADOS = [
    "/relatorios/faturamento",
    "/relatorios/insumos",
    "/relatorios/clientes",
    "/relatorios/vacinas",
  ];
  const temAvancados = temRecurso(conta.plano, "relatorios_avancados");

  return (
    <div>
      <PageHeader
        titulo="Relatórios"
        subtitulo="Escolha o relatório, ajuste o período e gere a saída para a tela ou para o papel."
      />

      <div className="space-y-6">
        {AREAS.map((area) => {
          const daArea = visiveis.filter((r) => r.area === area);
          if (daArea.length === 0) return null;

          return (
            <section key={area}>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                {area}
              </h2>
              {/* items-stretch + h-full no cartão: todos da fileira ficam
                  com a mesma altura, independente do tamanho do texto. */}
              <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {daArea.map((relatorio) => {
                  const trancado = !temAvancados && AVANCADOS.includes(relatorio.href);
                  return (
                  <Link
                    key={relatorio.href}
                    href={
                      trancado
                        ? "/assinatura/recurso/relatorios_avancados"
                        : relatorio.href
                    }
                    className="glass group flex h-full flex-col rounded-2xl p-4 transition-all hover:bg-white/20 hover:shadow-lg hover:shadow-black/10"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
                        <relatorio.icone
                          className="size-5"
                          strokeWidth={1.8}
                          aria-hidden
                        />
                      </span>
                      <span className="min-w-0 flex-1 font-semibold text-ink">
                        {relatorio.nome}
                      </span>
                      {trancado ? (
                        <Lock
                          className="size-4 shrink-0 text-ink-muted"
                          strokeWidth={2.2}
                          aria-label="Disponível em outro plano"
                        />
                      ) : (
                        <ChevronRight
                          className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className="mt-2 text-sm text-pretty text-ink-muted">
                      {relatorio.descricao}
                    </span>
                  </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {!podeFinanceiro && (
        <p className="mt-6 text-sm text-ink-muted">
          Os relatórios de faturamento e financeiro ficam disponíveis para
          administradores e veterinários.
        </p>
      )}
    </div>
  );
}
