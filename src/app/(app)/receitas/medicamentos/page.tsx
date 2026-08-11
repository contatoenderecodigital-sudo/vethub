import { Pill, Plus, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import {
  FORMAS_FARMACEUTICAS,
  VIAS_ADMINISTRACAO,
  rotuloFormaFarmaceutica,
  rotuloVia,
} from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { excluirMedicamento, salvarMedicamento } from "./actions";

export const metadata = { title: "Medicamentos" };

/**
 * O caderno de medicamentos da clínica.
 *
 * Cadastra uma vez, escolhe sempre. O veterinário prescreve os mesmos vinte
 * medicamentos a vida inteira; redigitar "Amoxicilina + Clavulanato 250 mg"
 * pela milésima vez é onde o sistema rouba tempo dele — e onde nasce o erro
 * de digitação que sai impresso numa receita.
 *
 * Não confundir com o catálogo (`/itens`), que é o que a clínica VENDE. Boa
 * parte do que se prescreve ela não vende: remédio de farmácia humana,
 * fórmula manipulada, marca que não estoca.
 */
interface Linha {
  id: string;
  nome: string;
  concentracao: string | null;
  forma_farmaceutica: string | null;
  via: string | null;
  quantidade_padrao: string | null;
  posologia_padrao: string | null;
  vezes_usado: number;
}

export default async function MedicamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel !== "recepcao";

  const { data } = await supabase
    .from("medicamento_receita")
    .select(
      "id, nome, concentracao, forma_farmaceutica, via, quantidade_padrao, posologia_padrao, vezes_usado"
    )
    .eq("ativo", true)
    // Mais receitados primeiro: é a ordem em que o veterinário procura.
    .order("vezes_usado", { ascending: false })
    .order("nome")
    .returns<Linha[]>();

  const medicamentos = data ?? [];
  const criar = salvarMedicamento.bind(null, null);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Medicamentos"
        subtitulo="Cadastre uma vez e escolha na receita, sem redigitar dose e posologia"
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      {podeEditar && (
        <Card className="mb-5">
          <h2 className="mb-3 text-base font-semibold text-ink">
            Novo medicamento
          </h2>
          <form action={criar} className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-ink">
                Medicamento <span className="text-red-100">*</span>
              </span>
              <Input
                name="nome"
                required
                maxLength={160}
                placeholder="Ex.: Amoxicilina + clavulanato"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Concentração
              </span>
              <Input name="concentracao" maxLength={80} placeholder="Ex.: 250 mg" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Forma farmacêutica
              </span>
              <Select name="forma_farmaceutica" defaultValue="">
                <option value="">Não informar</option>
                {FORMAS_FARMACEUTICAS.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Via</span>
              <Select name="via" defaultValue="oral">
                <option value="">Não informar</option>
                {VIAS_ADMINISTRACAO.map((v) => (
                  <option key={v.valor} value={v.valor}>
                    {v.rotulo}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Quantidade padrão
              </span>
              <Input
                name="quantidade_padrao"
                maxLength={80}
                placeholder="Ex.: 1 caixa com 14 comprimidos"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-ink">
                Posologia padrão
              </span>
              <Textarea
                name="posologia_padrao"
                rows={2}
                maxLength={500}
                placeholder="Ex.: 1 comprimido a cada 12 horas por 7 dias"
              />
              <span className="mt-1 block text-xs text-ink-muted">
                É o que mais economiza tempo: escolher o medicamento na receita
                já traz a posologia escrita, e o veterinário só ajusta a dose.
              </span>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-ink">
                Observação
              </span>
              <Input
                name="observacao"
                maxLength={300}
                placeholder="Ex.: administrar com alimento"
              />
            </label>

            <div className="sm:col-span-2">
              <SubmitButton>
                <Plus className="size-4" />
                Adicionar
              </SubmitButton>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">
          {medicamentos.length === 0
            ? "Nenhum medicamento cadastrado"
            : `${medicamentos.length} medicamento${medicamentos.length === 1 ? "" : "s"}`}
        </h2>

        {medicamentos.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Cadastre os que você mais receita. Na próxima receita, basta digitar
            as primeiras letras.
          </p>
        ) : (
          <ul className="divide-y divide-edge">
            {medicamentos.map((m) => (
              <li key={m.id} className="flex items-start gap-3 py-3 first:pt-0">
                <span className="glass mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Pill className="size-4" strokeWidth={1.8} aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {m.nome}
                    {m.concentracao && (
                      <span className="text-ink-muted"> · {m.concentracao}</span>
                    )}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {[
                      rotuloFormaFarmaceutica(m.forma_farmaceutica),
                      rotuloVia(m.via),
                      m.quantidade_padrao,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {m.posologia_padrao && (
                    <p className="mt-0.5 text-sm text-ink">{m.posologia_padrao}</p>
                  )}
                  {m.vezes_usado > 0 && (
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Receitado {m.vezes_usado}{" "}
                      {m.vezes_usado === 1 ? "vez" : "vezes"}
                    </p>
                  )}
                </div>

                {podeEditar && (
                  <form className="shrink-0">
                    <ConfirmButton
                      variante="ghost"
                      tamanho="sm"
                      className="min-w-11 lg:min-w-0"
                      formAction={excluirMedicamento.bind(null, m.id)}
                      mensagem={`Excluir "${m.nome}" do caderno de medicamentos? As receitas já emitidas não mudam.`}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Excluir {m.nome}</span>
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
