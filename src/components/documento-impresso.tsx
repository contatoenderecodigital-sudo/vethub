import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatEndereco, formatTelefone } from "@/lib/format";
import { mascaraCNPJ } from "@/lib/validacao";
import type { Clinica } from "@/lib/types";
import { BotaoImprimir } from "./botao-imprimir";

/**
 * A moldura de qualquer papel que sai desta clínica.
 *
 * Existia só no receituário, e cada documento novo copiava o mesmo bloco de
 * `@media print` — que é exatamente como um deles acaba saindo com o fundo
 * verde do app no papel, defeito que já apareceu aqui antes. Agora a regra
 * mora num lugar só: quem imprimir errado, imprime errado em todo lugar, e
 * conserta-se uma vez.
 *
 * O que ela garante: A4 com margem, fundo branco de verdade, nenhuma
 * navegação do app no papel, e cabeçalho com os dados da clínica — que é o
 * que dá validade ao documento na mão do tutor.
 */
export function DocumentoImpresso({
  clinica,
  titulo,
  voltarHref,
  voltarRotulo,
  rotuloBotao,
  children,
}: {
  clinica: Clinica | null;
  titulo: string;
  voltarHref: string;
  voltarRotulo: string;
  rotuloBotao: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #ffffff !important; }
          body::before { display: none !important; }
          header, aside, nav { display: none !important; }
          .documento { display: flex !important; }
          .documento header { display: block !important; }
          main { padding: 0 !important; }
          main > div { max-width: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-white p-8 text-zinc-900 print:p-0">
        <div className="mx-auto mb-6 flex max-w-[190mm] flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline"
          >
            <ArrowLeft className="size-4" />
            {voltarRotulo}
          </Link>
          <BotaoImprimir rotulo={rotuloBotao} />
        </div>

        <article className="documento mx-auto flex min-h-[247mm] max-w-[190mm] flex-col">
          <header className="border-b-2 border-zinc-900 pb-3">
            <h1 className="text-lg font-bold tracking-wide text-zinc-900 uppercase">
              {clinica?.nome ?? "Clínica veterinária"}
            </h1>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-700">
              {clinica?.cnpj && <>CNPJ {mascaraCNPJ(clinica.cnpj)} · </>}
              {clinica ? formatEndereco(clinica) : "-"}
            </p>
            {clinica?.telefone && (
              <p className="text-[11px] text-zinc-700">
                Telefone {formatTelefone(clinica.telefone)}
              </p>
            )}
          </header>

          <h2 className="mt-4 text-center text-base font-bold tracking-[0.12em] text-zinc-900 uppercase">
            {titulo}
          </h2>

          {children}
        </article>
      </div>
    </>
  );
}

/** Rótulo pequeno em maiúsculas, do jeito que documento impresso pede. */
export function RotuloImpresso({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
      {children}
    </span>
  );
}

/** Data por extenso da linha de assinatura: "9 de agosto de 2026". */
export function dataPorExtenso(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Linha de assinatura do veterinário, com espaço para carimbo e CRMV. */
export function AssinaturaVeterinario({
  cidade,
  data,
  nome,
}: {
  cidade?: string | null;
  data: string;
  nome?: string | null;
}) {
  return (
    <footer className="mt-10 break-inside-avoid">
      <p className="text-right text-[12px] text-zinc-700">
        {cidade ? `${cidade}, ` : ""}
        {dataPorExtenso(data)}
      </p>
      <div className="mx-auto mt-10 w-72 border-t border-zinc-900 pt-1 text-center">
        <p className="text-[12px] font-semibold text-zinc-900">
          {nome ?? "Médico(a) veterinário(a) responsável"}
        </p>
        <p className="text-[10px] text-zinc-600">
          Médico(a) veterinário(a) · CRMV ______________
        </p>
      </div>
      <p className="mt-8 text-center text-[10px] tracking-wide text-zinc-400 uppercase">
        Espaço reservado para carimbo
      </p>
    </footer>
  );
}
