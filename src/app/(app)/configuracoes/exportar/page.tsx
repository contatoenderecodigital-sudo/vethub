import { redirect } from "next/navigation";
import { Download, ShieldCheck } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Exportar dados · VetHub" };

/**
 * Levar a base embora.
 *
 * A tela do teste vencido promete que dá para exportar tudo. Por muito tempo
 * essa frase não tinha nada atrás dela, o que fazia dela mentira.
 *
 * Continua aberta com o teste vencido de propósito: é justamente quando
 * alguém quer a própria base na mão. Prender o dado de quem parou de pagar
 * renderia uma mensalidade e custaria a reputação inteira.
 */
const EXPORTACOES = [
  { tipo: "tutores", tabela: "tutor", titulo: "Tutores", descricao: "Nome, CPF, contato e endereço." },
  { tipo: "pets", tabela: "pet", titulo: "Pets", descricao: "Ficha de cada animal com o tutor junto." },
  { tipo: "consultas", tabela: "consulta", titulo: "Consultas", descricao: "Prontuário: queixa, exame, diagnóstico e conduta." },
  { tipo: "agendamentos", tabela: "agendamento", titulo: "Agenda", descricao: "Tudo que foi marcado, com a situação de cada horário." },
  { tipo: "vacinas", tabela: "protocolo_saude", titulo: "Vacinas e vermífugos", descricao: "Aplicações, lote e a data da próxima dose." },
  { tipo: "exames", tabela: "exame", titulo: "Exames", descricao: "Pedidos, situação e resultado." },
  { tipo: "itens", tabela: "item", titulo: "Produtos e serviços", descricao: "Catálogo com preço, custo e saldo de estoque." },
  { tipo: "vendas", tabela: "venda", titulo: "Vendas", descricao: "Cada venda com tutor, total e situação." },
  { tipo: "financeiro", tabela: "conta", titulo: "Financeiro", descricao: "Contas a pagar e a receber, com vencimento e baixa." },
] as const;

export default async function ExportarPage() {
  const { usuario } = await getSessao();
  // A lista inteira de tutores com CPF e telefone não é coisa que a recepção
  // baixe sem o dono saber. Mesma regra da API, para o menu do celular não
  // virar um atalho por fora.
  if (usuario.papel !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  // Quantas linhas cada arquivo vai ter. Baixar um CSV e descobrir que veio
  // vazio deixa a pessoa achando que o sistema comeu a base dela; o número
  // aqui resolve isso antes do clique. `head: true` traz só a contagem.
  const contagens = await Promise.all(
    EXPORTACOES.map((e) =>
      supabase.from(e.tabela).select("id", { count: "exact", head: true })
    )
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Exportar dados"
        subtitulo="Sua base em planilha, quando você quiser, sem pedir para ninguém."
      />

      <Card className="mb-4">
        <p className="flex gap-3 text-sm text-ink-muted">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-mint" strokeWidth={1.8} aria-hidden />
          <span>
            Os arquivos abrem direto no Excel, no Google Planilhas e no LibreOffice.
            Cada um traz só os dados desta clínica. Isso continua funcionando mesmo
            se você parar de pagar: a base é sua.
          </span>
        </p>
      </Card>

      <Card>
        <ul className="divide-y divide-edge">
          {EXPORTACOES.map((e, i) => {
            const total = contagens[i].count ?? 0;
            return (
              <li
                key={e.tipo}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {e.titulo}{" "}
                    <span className="text-sm font-normal text-ink-muted">
                      ({total.toLocaleString("pt-BR")}{" "}
                      {total === 1 ? "registro" : "registros"})
                    </span>
                  </p>
                  <p className="text-sm text-ink-muted">{e.descricao}</p>
                </div>

                {/* Âncora comum, não fetch: o navegador salva o arquivo sozinho
                    e a tela nem precisa de JavaScript para isso funcionar. */}
                <a
                  href={`/api/exportar/${e.tipo}`}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium ${
                    total === 0
                      ? "pointer-events-none opacity-40"
                      : "glass text-ink hover:bg-white/20"
                  }`}
                  aria-disabled={total === 0 || undefined}
                >
                  <Download className="size-4" strokeWidth={1.8} aria-hidden />
                  Baixar
                </a>
              </li>
            );
          })}
        </ul>
      </Card>

      <p className="mt-4 text-sm text-ink-muted">
        Precisa de algo que não está aqui, ou da base inteira de uma vez? Abra um
        chamado no Suporte que a gente monta e envia.
      </p>
    </div>
  );
}
