import Link from "next/link";
import { FlaskConical, Plus, Printer } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataISO } from "@/lib/format";
import { Card, CardTitulo } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { CampoData } from "@/components/ui/campo-data";
import { solicitarExame } from "@/app/(app)/exames/actions";

/**
 * Os exames do pet, do pedido ao laudo.
 *
 * Antes disso, exame morria numa linha de texto dentro da conduta da
 * consulta: quem quisesse saber o que já foi pedido para aquele animal — e
 * o que deu — teria que ler consulta por consulta. Aqui fica tudo junto e
 * o resultado fica GUARDADO, que é o que transforma exame em histórico
 * clínico em vez de papel avulso.
 */

interface ExameLinha {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  indicacao: string | null;
  resultado: string | null;
  solicitado_em: string;
  previsto_para: string | null;
  resultado_em: string | null;
  veterinario: { nome: string } | null;
}

const TOM: Record<string, "info" | "pending" | "success" | "neutro" | "danger"> = {
  solicitado: "info",
  coletado: "pending",
  pronto: "success",
  entregue: "neutro",
  cancelado: "danger",
};

const ROTULO: Record<string, string> = {
  solicitado: "Solicitado",
  coletado: "Coletado",
  pronto: "Resultado pronto",
  entregue: "Entregue ao tutor",
  cancelado: "Cancelado",
};

const TIPOS = [
  { valor: "laboratorial", rotulo: "Laboratorial" },
  { valor: "imagem", rotulo: "Imagem" },
  { valor: "outro", rotulo: "Outro" },
];

export async function ExamesDoPet({ petId }: { petId: string }) {
  const { supabase, usuario } = await getSessao();
  const podePedir = usuario.papel !== "recepcao";

  const { data } = await supabase
    .from("exame")
    .select(
      "id, nome, tipo, status, indicacao, resultado, solicitado_em, previsto_para, resultado_em, veterinario:veterinario_id (nome)"
    )
    .eq("pet_id", petId)
    .order("solicitado_em", { ascending: false })
    .returns<ExameLinha[]>();

  const exames = data ?? [];
  const pedir = solicitarExame.bind(null, `/pets/${petId}`);

  return (
    <Card>
      <CardTitulo>Exames</CardTitulo>

      {exames.length === 0 ? (
        <p className="mb-4 text-sm text-ink-muted">
          Nenhum exame solicitado para este pet ainda.
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-edge">
          {exames.map((e) => (
            <li key={e.id} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    <FlaskConical className="size-4 shrink-0 text-ink-muted" strokeWidth={1.8} aria-hidden />
                    {e.nome}
                    <Badge tom={TOM[e.status] ?? "neutro"}>
                      {ROTULO[e.status] ?? e.status}
                    </Badge>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Pedido em {formatDataISO(e.solicitado_em.slice(0, 10))}
                    {e.veterinario?.nome && ` · ${e.veterinario.nome}`}
                    {e.previsto_para &&
                      e.status === "solicitado" &&
                      ` · previsto para ${formatDataISO(e.previsto_para)}`}
                  </p>
                  {e.indicacao && (
                    <p className="mt-0.5 text-sm text-ink-muted">{e.indicacao}</p>
                  )}
                  {e.resultado && (
                    <p className="mt-1 rounded-lg border border-edge p-2 text-sm whitespace-pre-line text-ink">
                      {e.resultado}
                    </p>
                  )}
                </div>

                <Link
                  href={`/exames/${e.id}/imprimir`}
                  className="glass flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
                >
                  <Printer className="size-4" strokeWidth={1.8} aria-hidden />
                  Imprimir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {podePedir && (
        <details className="rounded-xl border border-edge p-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink">
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            Solicitar exame
          </summary>

          <form action={pedir} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="pet_id" value={petId} />
            <input type="hidden" name="consulta_id" value="" />

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-ink">
                Exame <span className="text-red-100">*</span>
              </span>
              <Input
                name="nome"
                required
                maxLength={160}
                placeholder="Ex.: Hemograma completo"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Tipo</span>
              <Select name="tipo" defaultValue="laboratorial">
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Previsto para
              </span>
              <CampoData name="previsto_para" aria-label="Previsto para" />
              <span className="mt-1 block text-xs text-ink-muted">
                Opcional. Aparece na fila da recepção.
              </span>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-ink">
                Indicação clínica
              </span>
              <Textarea
                name="indicacao"
                rows={2}
                maxLength={500}
                placeholder="O que se procura. O laboratório precisa disso para interpretar."
              />
            </label>

            <div className="sm:col-span-2">
              <SubmitButton>Solicitar</SubmitButton>
            </div>
          </form>
        </details>
      )}
    </Card>
  );
}
