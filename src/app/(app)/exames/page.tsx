import Link from "next/link";
import { FlaskConical, Printer } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { registrarResultado } from "./actions";

export const metadata = { title: "Exames" };

/**
 * Todos os exames da clínica, para quem acompanha o que está pendente.
 *
 * A ficha do pet responde "o que já pediram para este animal"; esta tela
 * responde a outra pergunta, que é a do dia a dia: "o que está esperando
 * resultado?". São coisas diferentes e por isso são duas telas.
 */

interface Linha {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  resultado: string | null;
  solicitado_em: string;
  previsto_para: string | null;
  pet: { id: string; nome: string; tutor: { nome: string } | null } | null;
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
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const FILTROS = [
  { valor: "", rotulo: "Em aberto" },
  { valor: "todos", rotulo: "Todos" },
  { valor: "pronto", rotulo: "Resultado pronto" },
  { valor: "entregue", rotulo: "Entregues" },
];

export default async function ExamesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; erro?: string }>;
}) {
  const { status, erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel !== "recepcao";

  let query = supabase
    .from("exame")
    .select(
      "id, nome, tipo, status, resultado, solicitado_em, previsto_para, pet:pet_id (id, nome, tutor:tutor_id (nome)), veterinario:veterinario_id (nome)"
    )
    .order("solicitado_em", { ascending: false })
    .limit(100);

  if (!status) query = query.in("status", ["solicitado", "coletado", "pronto"]);
  else if (status !== "todos") query = query.eq("status", status);

  const { data } = await query.returns<Linha[]>();
  const exames = data ?? [];

  return (
    <div>
      <PageHeader
        titulo="Exames"
        subtitulo="O que foi pedido, o que está esperando resultado e o que já saiu"
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = (status ?? "") === f.valor;
          return (
            <Link
              key={f.valor || "aberto"}
              href={f.valor ? `/exames?status=${f.valor}` : "/exames"}
              aria-current={ativo ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors ${
                ativo
                  ? "bg-white font-semibold text-brand-dark"
                  : "glass font-medium text-ink-muted hover:text-ink"
              }`}
            >
              {f.rotulo}
            </Link>
          );
        })}
      </div>

      <Card>
        {exames.length === 0 ? (
          <EmptyState
            icone={<FlaskConical className="size-7" strokeWidth={1.8} />}
            titulo="Nenhum exame"
            mensagem="Os exames são solicitados na ficha do pet, pelo veterinário."
          />
        ) : (
          <ul className="divide-y divide-edge">
            {exames.map((e) => (
              <li key={e.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {e.nome}
                      <Badge tom={TOM[e.status] ?? "neutro"}>
                        {ROTULO[e.status] ?? e.status}
                      </Badge>
                    </p>
                    <p className="text-sm text-ink-muted">
                      {e.pet ? (
                        <Link href={`/pets/${e.pet.id}`} className="hover:underline">
                          {e.pet.nome}
                        </Link>
                      ) : (
                        "-"
                      )}
                      {e.pet?.tutor?.nome && ` · ${e.pet.tutor.nome}`}
                      {" · pedido em "}
                      {formatDataISO(e.solicitado_em.slice(0, 10))}
                      {e.veterinario?.nome && ` · ${e.veterinario.nome}`}
                    </p>
                  </div>

                  <Link
                    href={`/exames/${e.id}/imprimir`}
                    className="glass flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
                  >
                    <Printer className="size-4" strokeWidth={1.8} aria-hidden />
                    Imprimir
                  </Link>
                </div>

                {podeEditar && e.status !== "entregue" && e.status !== "cancelado" && (
                  <form
                    action={registrarResultado.bind(
                      null,
                      e.id,
                      e.pet?.id ?? "",
                      "/exames"
                    )}
                    className="mt-2 grid gap-2 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
                  >
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-muted">
                        Resultado
                      </span>
                      <textarea
                        name="resultado"
                        rows={2}
                        maxLength={4000}
                        defaultValue={e.resultado ?? ""}
                        placeholder="Cole ou digite o laudo. Fica guardado na ficha do pet."
                        className="glass w-full rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-muted">
                        Situação
                      </span>
                      <Select name="status" defaultValue={e.status}>
                        <option value="solicitado">Solicitado</option>
                        <option value="coletado">Coletado</option>
                        <option value="pronto">Resultado pronto</option>
                        <option value="cancelado">Cancelado</option>
                      </Select>
                    </label>
                    <SubmitButton variante="secondary" tamanho="sm" className="min-h-11">
                      Salvar
                    </SubmitButton>
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
