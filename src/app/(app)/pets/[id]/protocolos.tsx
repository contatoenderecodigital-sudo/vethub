import Link from "next/link";
import { Bug, Pill, Plus, Syringe, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { diasAte, formatDataISO, hojeISO } from "@/lib/format";
import { TIPOS_PROTOCOLO, type TipoProtocolo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { excluirProtocolo, registrarProtocolo } from "../actions";

interface ProtocoloLinha {
  id: string;
  tipo: TipoProtocolo;
  nome: string;
  dose: string | null;
  lote: string | null;
  fabricante: string | null;
  data_aplicacao: string;
  proxima_dose: string | null;
  observacao: string | null;
  veterinario: { nome: string } | { nome: string }[] | null;
}

const ICONE: Record<TipoProtocolo, typeof Syringe> = {
  vacina: Syringe,
  vermifugo: Pill,
  antiparasitario: Bug,
};

const ROTULO: Record<TipoProtocolo, string> = {
  vacina: "Vacina",
  vermifugo: "Vermífugo",
  antiparasitario: "Antiparasitário",
};

/** Situação do reforço: atrasado, vencendo em até 30 dias ou em dia. */
function statusProximaDose(proxima: string | null) {
  const dias = diasAte(proxima);
  if (dias === null) return null;
  if (dias < 0) return { tom: "danger" as const, texto: "Atrasada" };
  if (dias === 0) return { tom: "pending" as const, texto: "Vence hoje" };
  if (dias <= 30) {
    return {
      tom: "pending" as const,
      texto: `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`,
    };
  }
  return { tom: "success" as const, texto: "Em dia" };
}

/**
 * Vacinas, vermífugos e antiparasitários do pet (as três abas do
 * prontuário da Peti9) com controle de reforço.
 */
export async function Protocolos({
  petId,
  tipoAtivo,
}: {
  petId: string;
  /** Filtro vindo da URL (?tipo=vacina). Vazio = todos. */
  tipoAtivo?: TipoProtocolo | "";
}) {
  const { supabase } = await getSessao();

  const { data } = await supabase
    .from("protocolo_saude")
    .select(
      "id, tipo, nome, dose, lote, fabricante, data_aplicacao, proxima_dose, observacao, veterinario:veterinario_id (nome)"
    )
    .eq("pet_id", petId)
    .order("data_aplicacao", { ascending: false })
    .limit(100)
    .returns<ProtocoloLinha[]>();

  const todos = data ?? [];
  const lista = tipoAtivo ? todos.filter((p) => p.tipo === tipoAtivo) : todos;

  const registrar = registrarProtocolo.bind(null, petId);
  const hoje = hojeISO();

  const abas = [
    { valor: "" as const, rotulo: "Todos", total: todos.length },
    ...TIPOS_PROTOCOLO.map((t) => ({
      valor: t.valor,
      rotulo: t.plural,
      total: todos.filter((p) => p.tipo === t.valor).length,
    })),
  ];

  return (
    <Card>
      <div id="protocolos" className="scroll-mt-24" />
      <CardTitulo className="flex items-center gap-2">
        <Syringe className="size-4 text-ink-muted" aria-hidden />
        Protocolos de saúde
      </CardTitulo>

      <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto pb-1">
        {abas.map((aba) => {
          const ativa = (tipoAtivo ?? "") === aba.valor;
          const href = aba.valor
            ? `/pets/${petId}?tipo=${aba.valor}#protocolos`
            : `/pets/${petId}#protocolos`;
          return (
            <Link
              key={aba.valor || "todos"}
              href={href}
              scroll={false}
              aria-current={ativa ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                ativa
                  ? "bg-white text-brand-dark"
                  : "border border-white/30 bg-white/10 text-ink-muted hover:bg-white/20 hover:text-ink"
              }`}
            >
              {aba.rotulo} ({aba.total})
            </Link>
          );
        })}
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icone={<Syringe className="size-7" strokeWidth={1.8} />}
          titulo="Nenhum registro"
          mensagem={
            tipoAtivo
              ? "Este pet ainda não tem registros deste tipo."
              : "Registre a primeira vacina, vermífugo ou antiparasitário."
          }
        />
      ) : (
        <ul className="divide-y divide-white/15">
          {lista.map((p) => {
            const Icone = ICONE[p.tipo];
            const status = statusProximaDose(p.proxima_dose);
            const vet = Array.isArray(p.veterinario)
              ? p.veterinario[0]
              : p.veterinario;
            const excluir = excluirProtocolo.bind(null, p.id, petId);
            return (
              <li key={p.id} className="flex items-start gap-3 py-2.5">
                <span
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
                  aria-hidden
                >
                  <Icone className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-medium text-ink">{p.nome}</p>
                    {p.dose && <Badge tom="neutro">{p.dose}</Badge>}
                    {status && <Badge tom={status.tom}>{status.texto}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {ROTULO[p.tipo]} · Aplicado em {formatDataISO(p.data_aplicacao)}
                    {p.proxima_dose && ` · Próxima ${formatDataISO(p.proxima_dose)}`}
                    {vet?.nome && ` · ${vet.nome}`}
                  </p>
                  {(p.lote || p.fabricante) && (
                    <p className="text-xs text-ink-muted">
                      {[
                        p.fabricante,
                        p.lote ? `Lote ${p.lote}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {p.observacao && (
                    <p className="mt-0.5 whitespace-pre-line text-xs text-ink-muted">
                      {p.observacao}
                    </p>
                  )}
                </div>
                <form action={excluir} className="shrink-0">
                  <ConfirmButton
                    variante="ghost"
                    tamanho="sm"
                    mensagem={`Excluir o registro de ${p.nome}?`}
                    aria-label={`Excluir ${p.nome}`}
                    className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-0"
                  >
                    <Trash2 className="size-4" />
                  </ConfirmButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-4 rounded-xl border border-edge bg-white/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-ink">
          <span className="inline-flex items-center gap-2">
            <Plus className="size-4" aria-hidden />
            Registrar vacina, vermífugo ou antiparasitário
          </span>
        </summary>

        <form
          action={registrar}
          key={todos.length}
          className="space-y-3 border-t border-white/20 p-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Tipo" htmlFor="protocolo-tipo" obrigatorio>
              <Select
                id="protocolo-tipo"
                name="tipo"
                defaultValue={tipoAtivo || "vacina"}
                required
              >
                {TIPOS_PROTOCOLO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo rotulo="Nome do produto" htmlFor="protocolo-nome" obrigatorio>
              <Input
                id="protocolo-nome"
                name="nome"
                placeholder="Ex.: V10, Bravecto"
                required
              />
            </Campo>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Dose" htmlFor="protocolo-dose">
              <Input
                id="protocolo-dose"
                name="dose"
                placeholder="Ex.: 1ª dose"
              />
            </Campo>
            <Campo rotulo="Lote" htmlFor="protocolo-lote">
              <Input id="protocolo-lote" name="lote" />
            </Campo>
            <Campo rotulo="Fabricante" htmlFor="protocolo-fabricante">
              <Input id="protocolo-fabricante" name="fabricante" />
            </Campo>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              rotulo="Data de aplicação"
              htmlFor="protocolo-aplicacao"
              obrigatorio
            >
              <CampoData
                id="protocolo-aplicacao"
                name="data_aplicacao"
                defaultValue={hoje}
                min="1980-01-01"
                max={hoje}
                required
              />
            </Campo>
            <Campo
              rotulo="Próxima dose"
              htmlFor="protocolo-proxima"
              dica="Alimenta os lembretes de reforço."
            >
              <CampoData
                id="protocolo-proxima"
                name="proxima_dose"
                min="1980-01-01"
              />
            </Campo>
          </div>

          <Campo rotulo="Observação" htmlFor="protocolo-observacao">
            <Textarea
              id="protocolo-observacao"
              name="observacao"
              className="min-h-20"
              placeholder="Reação, local da aplicação, orientações ao tutor…"
            />
          </Campo>

          <SubmitButton variante="secondary" carregando="Registrando…">
            Registrar
          </SubmitButton>
        </form>
      </details>
    </Card>
  );
}
