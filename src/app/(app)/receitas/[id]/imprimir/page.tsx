import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessao } from "@/lib/auth";
import {
  formatDataISO,
  formatEndereco,
  formatPeso,
  formatTelefone,
  idadeDetalhada,
} from "@/lib/format";
import { mascaraCNPJ, mascaraCPF } from "@/lib/validacao";
import {
  rotuloFormaFarmaceutica,
  usoDaVia,
  type Clinica,
  type ReceitaItem,
  type ReceitaTipo,
} from "@/lib/types";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata = { title: "Imprimir receita" };

interface ReceitaImpressao {
  id: string;
  tipo: ReceitaTipo;
  data: string;
  orientacoes: string | null;
  retorno_em: string | null;
  pet: {
    nome: string;
    especie: string;
    raca: string | null;
    peso: number | null;
    data_nascimento: string | null;
    tutor: {
      nome: string;
      cpf: string | null;
      cep: string | null;
      logradouro: string | null;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string | null;
      uf: string | null;
    } | null;
  } | null;
  veterinario: { nome: string } | null;
}

/** Data por extenso para a linha de assinatura: "4 de agosto de 2026". */
function dataPorExtenso(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Agrupa medicamentos consecutivos da mesma via ("Uso oral"). */
function agruparPorUso(itens: ReceitaItem[]) {
  const grupos: { uso: string | null; inicio: number; itens: ReceitaItem[] }[] = [];
  itens.forEach((item, indice) => {
    const uso = usoDaVia(item.via);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.uso === uso) ultimo.itens.push(item);
    else grupos.push({ uso, inicio: indice, itens: [item] });
  });
  return grupos;
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </span>
  );
}

export default async function ImprimirReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, usuario } = await getSessao();

  const [{ data: receita }, { data: clinica }, { data: itens }] = await Promise.all([
    supabase
      .from("receita")
      .select(
        "id, tipo, data, orientacoes, retorno_em, pet:pet_id (nome, especie, raca, peso, data_nascimento, tutor:tutor_id (nome, cpf, cep, logradouro, numero, complemento, bairro, cidade, uf)), veterinario:veterinario_id (nome)"
      )
      .eq("id", id)
      .single<ReceitaImpressao>(),
    supabase
      .from("clinica")
      .select("*")
      .eq("id", usuario.clinica_id)
      .single<Clinica>(),
    supabase
      .from("receita_item")
      .select("*")
      .eq("receita_id", id)
      .order("ordem")
      .returns<ReceitaItem[]>(),
  ]);

  if (!receita) notFound();

  const pet = receita.pet;
  const tutor = pet?.tutor ?? null;
  const grupos = agruparPorUso(itens ?? []);
  const controlada = receita.tipo === "controlada";
  const titulo = controlada
    ? "RECEITUÁRIO DE CONTROLE ESPECIAL"
    : "RECEITUÁRIO VETERINÁRIO";
  // Receita de controle especial vai em duas vias (farmácia e paciente).
  const vias = controlada
    ? ["1ª via · Farmácia", "2ª via · Paciente"]
    : [null];

  /** Uma via completa do documento (repetida quando a receita é controlada). */
  const Documento = ({ via }: { via: string | null }) => (
    <article className="receita-documento mx-auto flex min-h-[247mm] max-w-[190mm] flex-col">
      {/* Cabeçalho da clínica */}
      <header className="border-b-2 border-zinc-900 pb-3">
        <h1 className="text-lg font-bold uppercase tracking-wide text-zinc-900">
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

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h2 className="text-center text-base font-bold uppercase tracking-[0.12em] text-zinc-900">
          {titulo}
        </h2>
        {via && (
          <span className="shrink-0 rounded border border-zinc-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
            {via}
          </span>
        )}
      </div>

      {/* Identificação do paciente e do tutor */}
      <section className="mt-3 grid gap-3 border border-zinc-300 p-3 text-[12px] sm:grid-cols-2">
        <div>
          <Rotulo>Paciente</Rotulo>
          <p className="font-semibold text-zinc-900">{pet?.nome ?? "-"}</p>
          <p className="text-zinc-700">
            {pet?.especie ?? "-"}
            {pet?.raca ? ` · ${pet.raca}` : ""}
          </p>
          <p className="text-zinc-700">
            Peso: {formatPeso(pet?.peso)} · Idade:{" "}
            {idadeDetalhada(pet?.data_nascimento)}
          </p>
        </div>
        <div>
          <Rotulo>Tutor responsável</Rotulo>
          <p className="font-semibold text-zinc-900">{tutor?.nome ?? "-"}</p>
          {tutor?.cpf && (
            <p className="text-zinc-700">CPF {mascaraCPF(tutor.cpf)}</p>
          )}
          <p className="text-zinc-700">{tutor ? formatEndereco(tutor) : "-"}</p>
        </div>
        <div className="sm:col-span-2">
          <Rotulo>Data da prescrição</Rotulo>{" "}
          <span className="font-semibold text-zinc-900">
            {formatDataISO(receita.data)}
          </span>
        </div>
      </section>

      {/* Medicamentos, agrupados pelo uso ("Uso oral") */}
      <section className="mt-5 flex-1">
        {grupos.map((grupo) => (
          <div key={`${grupo.uso ?? "sem-via"}-${grupo.inicio}`} className="mb-5">
            {grupo.uso && (
              <p className="mb-2 border-b border-zinc-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-zinc-900">
                {grupo.uso}
              </p>
            )}
            <ol className="space-y-3">
              {grupo.itens.map((item, indice) => {
                const forma = rotuloFormaFarmaceutica(item.forma_farmaceutica);
                return (
                  <li key={item.id} className="break-inside-avoid text-[12px]">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-bold text-zinc-900">
                        {grupo.inicio + indice + 1}. {item.medicamento}
                        {item.concentracao ? ` ${item.concentracao}` : ""}
                        {forma ? ` · ${forma}` : ""}
                      </p>
                      {item.quantidade && (
                        <span className="shrink-0 font-semibold text-zinc-900">
                          {item.quantidade}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap pl-6 text-zinc-800">
                      {item.posologia}
                    </p>
                    {item.observacao && (
                      <p className="mt-0.5 whitespace-pre-wrap pl-6 italic text-zinc-600">
                        {item.observacao}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}

        {receita.orientacoes && (
          <div className="mt-6 break-inside-avoid border-t border-zinc-300 pt-3 text-[12px]">
            <Rotulo>Orientações gerais</Rotulo>
            <p className="mt-1 whitespace-pre-wrap text-zinc-800">
              {receita.orientacoes}
            </p>
          </div>
        )}

        {receita.retorno_em && (
          <p className="mt-4 text-[12px] font-semibold text-zinc-900">
            Retorno: {formatDataISO(receita.retorno_em)}
          </p>
        )}
      </section>

      {/* Assinatura, carimbo e CRMV */}
      <footer className="mt-10 break-inside-avoid">
        <p className="text-right text-[12px] text-zinc-700">
          {clinica?.cidade ? `${clinica.cidade}, ` : ""}
          {dataPorExtenso(receita.data)}
        </p>
        <div className="mx-auto mt-10 w-72 border-t border-zinc-900 pt-1 text-center">
          <p className="text-[12px] font-semibold text-zinc-900">
            {receita.veterinario?.nome ?? "Médico(a) veterinário(a) responsável"}
          </p>
          <p className="text-[10px] text-zinc-600">
            Médico(a) veterinário(a) · CRMV ______________
          </p>
        </div>
        <p className="mt-8 text-center text-[10px] uppercase tracking-wide text-zinc-400">
          Espaço reservado para carimbo
        </p>
      </footer>
    </article>
  );

  return (
    <>
      {/* A receita é um documento: fundo branco, sem o vidro do app e sem
          nenhuma navegação no papel. */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #ffffff !important; }
          body::before { display: none !important; }
          /* Some qualquer navegação do app; o cabeçalho do documento fica. */
          header, aside, nav { display: none !important; }
          .receita-documento { display: flex !important; }
          .receita-documento header { display: block !important; }
          main { padding: 0 !important; }
          main > div { max-width: none !important; }
        }
      `}</style>

      <div className="bg-white text-zinc-900 min-h-screen p-8 print:p-0">
        <div className="mx-auto mb-6 flex max-w-[190mm] flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/receitas/${id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Voltar para a receita
          </Link>
          <BotaoImprimir />
        </div>

        {vias.map((via, indice) => (
          <div
            key={via ?? "unica"}
            className={indice < vias.length - 1 ? "break-after-page" : undefined}
          >
            <Documento via={via} />
          </div>
        ))}
      </div>
    </>
  );
}
