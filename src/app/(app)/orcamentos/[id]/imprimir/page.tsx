import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO, formatTelefone } from "@/lib/format";
import type { Clinica } from "@/lib/types";
import {
  AssinaturaVeterinario,
  DocumentoImpresso,
  RotuloImpresso,
} from "@/components/documento-impresso";

export const metadata = { title: "Imprimir orçamento" };

/**
 * O orçamento em papel, para o tutor levar embora e pensar.
 *
 * Existia na tela e não existia no papel — e orçamento que não sai da tela
 * não fecha venda: o tutor precisa levar o número para casa, mostrar para
 * quem decide junto e voltar. Era a peça que faltava justamente no documento
 * cuja função inteira é sair da clínica.
 *
 * Traz validade e uma linha de aceite, que é o que transforma a folha em
 * combinado — sem isso o tutor volta em três meses cobrando o preço antigo.
 */

/** Quantos dias o orçamento vale. Prazo curto porque preço de insumo muda. */
const DIAS_DE_VALIDADE = 15;

interface OrcamentoImpressao {
  id: string;
  status: string;
  valor_total: number;
  created_at: string;
  pet: {
    nome: string;
    especie: string;
    raca: string | null;
    tutor: { nome: string; telefone: string | null } | null;
  } | null;
  consulta: { veterinario: { nome: string } | null } | null;
}

interface ItemLinha {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export default async function ImprimirOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, usuario } = await getSessao();

  const [{ data: orcamento }, { data: clinica }, { data: itens }] = await Promise.all([
    supabase
      .from("orcamento")
      .select(
        "id, status, valor_total, created_at, " +
          "pet:pet_id (nome, especie, raca, tutor:tutor_id (nome, telefone)), " +
          "consulta:consulta_id (veterinario:veterinario_id (nome))"
      )
      .eq("id", id)
      .single<OrcamentoImpressao>(),
    supabase.from("clinica").select("*").eq("id", usuario.clinica_id).single<Clinica>(),
    supabase
      .from("orcamento_item")
      .select("id, descricao, quantidade, valor_unitario")
      .eq("orcamento_id", id)
      .order("created_at")
      .returns<ItemLinha[]>(),
  ]);

  if (!orcamento) notFound();

  const pet = orcamento.pet;
  const tutor = pet?.tutor ?? null;
  const emitido = orcamento.created_at.slice(0, 10);
  const validade = new Date(`${emitido}T12:00:00`);
  validade.setDate(validade.getDate() + DIAS_DE_VALIDADE);

  return (
    <DocumentoImpresso
      clinica={clinica}
      titulo="Orçamento"
      voltarHref={`/orcamentos/${id}`}
      voltarRotulo="Voltar para o orçamento"
      rotuloBotao="Imprimir orçamento"
    >
      {/* Identificação */}
      <section className="mt-3 grid gap-3 border border-zinc-300 p-3 text-[12px] sm:grid-cols-2">
        <div>
          <RotuloImpresso>Paciente</RotuloImpresso>
          <p className="font-semibold text-zinc-900">{pet?.nome ?? "-"}</p>
          <p className="text-zinc-700">
            {[pet?.especie, pet?.raca].filter(Boolean).join(" · ") || "-"}
          </p>
        </div>
        <div>
          <RotuloImpresso>Tutor</RotuloImpresso>
          <p className="font-semibold text-zinc-900">{tutor?.nome ?? "-"}</p>
          {tutor?.telefone && (
            <p className="text-zinc-700">{formatTelefone(tutor.telefone)}</p>
          )}
        </div>
      </section>

      {/* Os itens */}
      <section className="mt-4 flex-1">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-zinc-400 text-left">
              <th className="pb-1 font-semibold text-zinc-900">Descrição</th>
              <th className="pb-1 text-right font-semibold text-zinc-900">Qtd.</th>
              <th className="pb-1 text-right font-semibold text-zinc-900">
                Valor unitário
              </th>
              <th className="pb-1 text-right font-semibold text-zinc-900">Total</th>
            </tr>
          </thead>
          <tbody>
            {(itens ?? []).map((i) => (
              <tr key={i.id} className="border-b border-zinc-200">
                <td className="py-1.5 text-zinc-900">{i.descricao}</td>
                <td className="py-1.5 text-right text-zinc-700 tabular-nums">
                  {Number(i.quantidade).toLocaleString("pt-BR")}
                </td>
                <td className="py-1.5 text-right text-zinc-700 tabular-nums">
                  {formatBRL(i.valor_unitario)}
                </td>
                <td className="py-1.5 text-right font-medium text-zinc-900 tabular-nums">
                  {formatBRL(i.quantidade * i.valor_unitario)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-right font-semibold text-zinc-900">
                Total do orçamento
              </td>
              <td className="pt-3 text-right text-base font-bold text-zinc-900 tabular-nums">
                {formatBRL(orcamento.valor_total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Validade e condições. É o que impede o tutor de voltar em três
            meses cobrando o preço de hoje — e o que evita a conversa
            desagradável no balcão quando isso acontece. */}
        <div className="mt-6 border border-zinc-300 p-3 text-[11px] leading-relaxed text-zinc-700">
          <p>
            <strong className="text-zinc-900">Validade:</strong>{" "}
            {formatDataISO(validade.toISOString().slice(0, 10))} ({DIAS_DE_VALIDADE}{" "}
            dias a partir da emissão).
          </p>
          <p className="mt-1">
            Este orçamento é uma estimativa. Procedimentos e materiais podem
            mudar conforme a evolução do quadro clínico do animal; qualquer
            alteração será combinada com o tutor antes de ser realizada.
          </p>
        </div>

        {/* Aceite: transforma a folha em combinado. */}
        <div className="mt-8 break-inside-avoid">
          <RotuloImpresso>Aceite do tutor</RotuloImpresso>
          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_10rem]">
            <div className="border-t border-zinc-900 pt-1">
              <p className="text-[10px] text-zinc-600">
                Assinatura do tutor — {tutor?.nome ?? ""}
              </p>
            </div>
            <div className="border-t border-zinc-900 pt-1">
              <p className="text-[10px] text-zinc-600">Data</p>
            </div>
          </div>
        </div>
      </section>

      <AssinaturaVeterinario
        cidade={clinica?.cidade}
        data={emitido}
        nome={orcamento.consulta?.veterinario?.nome}
      />
    </DocumentoImpresso>
  );
}
