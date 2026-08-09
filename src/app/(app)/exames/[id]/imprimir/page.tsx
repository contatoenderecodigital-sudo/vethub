import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { formatDataISO, formatPeso, formatTelefone, idadeDetalhada } from "@/lib/format";
import type { Clinica } from "@/lib/types";
import {
  AssinaturaVeterinario,
  DocumentoImpresso,
  RotuloImpresso,
} from "@/components/documento-impresso";

export const metadata = { title: "Imprimir exame" };

/**
 * O papel do exame — que serve para duas coisas diferentes.
 *
 * Antes do resultado, é a REQUISIÇÃO que o tutor leva ao laboratório: sem
 * indicação clínica escrita, o laboratório não sabe o que procurar e o
 * veterinário recebe um laudo que não responde a pergunta dele.
 *
 * Depois do resultado, é o LAUDO para o tutor levar embora e guardar. Um
 * documento só, porque na prática é a mesma folha que vai e volta.
 */

interface ExameImpressao {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  indicacao: string | null;
  resultado: string | null;
  solicitado_em: string;
  previsto_para: string | null;
  resultado_em: string | null;
  pet: {
    nome: string;
    especie: string;
    raca: string | null;
    peso: number | null;
    sexo: string | null;
    data_nascimento: string | null;
    tutor: { nome: string; telefone: string | null } | null;
  } | null;
  veterinario: { nome: string } | null;
}

const TIPO: Record<string, string> = {
  laboratorial: "Exame laboratorial",
  imagem: "Exame de imagem",
  outro: "Exame",
};

export default async function ImprimirExamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, usuario } = await getSessao();

  const [{ data: exame }, { data: clinica }] = await Promise.all([
    supabase
      .from("exame")
      .select(
        "id, nome, tipo, status, indicacao, resultado, solicitado_em, previsto_para, resultado_em, " +
          "pet:pet_id (nome, especie, raca, peso, sexo, data_nascimento, tutor:tutor_id (nome, telefone)), " +
          "veterinario:veterinario_id (nome)"
      )
      .eq("id", id)
      .single<ExameImpressao>(),
    supabase.from("clinica").select("*").eq("id", usuario.clinica_id).single<Clinica>(),
  ]);

  if (!exame) notFound();

  const pet = exame.pet;
  const tutor = pet?.tutor ?? null;
  const temLaudo = !!exame.resultado;
  const emitido = (temLaudo ? exame.resultado_em : exame.solicitado_em) ?? exame.solicitado_em;

  return (
    <DocumentoImpresso
      clinica={clinica}
      titulo={temLaudo ? "Resultado de exame" : "Requisição de exame"}
      voltarHref={`/exames`}
      voltarRotulo="Voltar para exames"
      rotuloBotao={temLaudo ? "Imprimir resultado" : "Imprimir requisição"}
    >
      {/* Identificação do paciente */}
      <section className="mt-3 grid gap-3 border border-zinc-300 p-3 text-[12px] sm:grid-cols-2">
        <div>
          <RotuloImpresso>Paciente</RotuloImpresso>
          <p className="font-semibold text-zinc-900">{pet?.nome ?? "-"}</p>
          <p className="text-zinc-700">
            {[
              pet?.especie,
              pet?.raca,
              pet?.sexo === "macho" ? "Macho" : pet?.sexo === "femea" ? "Fêmea" : null,
            ]
              .filter(Boolean)
              .join(" · ") || "-"}
          </p>
          <p className="text-zinc-700">
            {[
              pet?.data_nascimento ? idadeDetalhada(pet.data_nascimento) : null,
              pet?.peso ? formatPeso(pet.peso) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
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

      <section className="mt-4 flex-1">
        <div className="border border-zinc-300 p-3">
          <RotuloImpresso>{TIPO[exame.tipo] ?? "Exame"}</RotuloImpresso>
          <p className="text-base font-bold text-zinc-900">{exame.nome}</p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Solicitado em {formatDataISO(exame.solicitado_em.slice(0, 10))}
            {exame.previsto_para && !temLaudo && (
              <> · previsto para {formatDataISO(exame.previsto_para)}</>
            )}
          </p>
        </div>

        {/* A indicação clínica é o que o laboratório precisa para interpretar.
            Sem ela o laudo volta genérico e não responde a pergunta do
            veterinário. */}
        {exame.indicacao && (
          <div className="mt-3 border border-zinc-300 p-3">
            <RotuloImpresso>Indicação clínica</RotuloImpresso>
            <p className="mt-1 text-[12px] whitespace-pre-line text-zinc-900">
              {exame.indicacao}
            </p>
          </div>
        )}

        {temLaudo ? (
          <div className="mt-3 border border-zinc-300 p-3">
            <RotuloImpresso>Resultado</RotuloImpresso>
            <p className="mt-1 text-[12px] whitespace-pre-line text-zinc-900">
              {exame.resultado}
            </p>
          </div>
        ) : (
          // Sem resultado ainda: a folha vira a requisição em branco que o
          // laboratório preenche na coleta.
          <div className="mt-3 border border-zinc-300 p-3">
            <RotuloImpresso>Para uso do laboratório</RotuloImpresso>
            <div className="mt-2 space-y-5 text-[11px] text-zinc-500">
              <p className="border-b border-dotted border-zinc-400 pb-1">
                Data da coleta: ______/______/__________
              </p>
              <p className="border-b border-dotted border-zinc-400 pb-1">
                Responsável pela coleta: ______________________________________
              </p>
              <p className="border-b border-dotted border-zinc-400 pb-1">
                Observações: ________________________________________________
              </p>
            </div>
          </div>
        )}
      </section>

      <AssinaturaVeterinario
        cidade={clinica?.cidade}
        data={emitido.slice(0, 10)}
        nome={exame.veterinario?.nome}
      />
    </DocumentoImpresso>
  );
}
