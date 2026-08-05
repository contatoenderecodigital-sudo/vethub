import { Trash2, TrendingDown, TrendingUp, Weight } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataISO, formatPeso, hojeISO } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { SubmitButton } from "@/components/ui/submit-button";
import { excluirPesagem, registrarPesagem } from "../actions";

interface PesagemLinha {
  id: string;
  peso: number;
  data: string;
  observacao: string | null;
}

/** Variação entre duas pesagens: quilos e percentual, sem leitura clínica. */
function variacao(atual: number, anterior: number) {
  const delta = atual - anterior;
  const pct = anterior > 0 ? (delta / anterior) * 100 : 0;
  return {
    delta,
    pct,
    texto: `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(
      delta
    ).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg · ${Math.abs(
      pct
    ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
  };
}

/**
 * Peso do pet com histórico (a Peti9 mostra "40 kg (18/09/2025)").
 * O peso atual do cadastro é sincronizado por trigger com a pesagem
 * mais recente, então basta registrar aqui.
 */
export async function PesoHistorico({
  petId,
  pesoAtual,
}: {
  petId: string;
  pesoAtual: number | null;
}) {
  const { supabase } = await getSessao();

  const { data } = await supabase
    .from("pesagem")
    .select("id, peso, data, observacao")
    .eq("pet_id", petId)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<PesagemLinha[]>();

  const pesagens = (data ?? []).map((p) => ({ ...p, peso: Number(p.peso) }));
  const ultima = pesagens[0];
  const anterior = pesagens[1];
  const variacaoAtual =
    ultima && anterior ? variacao(ultima.peso, anterior.peso) : null;

  const registrar = registrarPesagem.bind(null, petId);
  const hoje = hojeISO();

  return (
    <Card>
      <CardTitulo className="flex items-center gap-2">
        <Weight className="size-4 text-ink-muted" aria-hidden />
        Peso
      </CardTitulo>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-bold text-ink tabular-nums">
          {formatPeso(ultima ? ultima.peso : pesoAtual)}
        </span>
        {ultima && (
          <span className="text-sm text-ink-muted">
            · {formatDataISO(ultima.data)}
          </span>
        )}
        {variacaoAtual && variacaoAtual.delta !== 0 && (
          <Badge tom={variacaoAtual.delta > 0 ? "success" : "pending"}>
            {variacaoAtual.delta > 0 ? (
              <TrendingUp className="mr-1 size-3.5" aria-hidden />
            ) : (
              <TrendingDown className="mr-1 size-3.5" aria-hidden />
            )}
            {variacaoAtual.texto}
          </Badge>
        )}
        {variacaoAtual && variacaoAtual.delta === 0 && (
          <Badge tom="neutro">Sem variação</Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {ultima
          ? anterior
            ? `Comparado com ${formatPeso(anterior.peso)} em ${formatDataISO(
                anterior.data
              )}`
            : "Primeira pesagem registrada."
          : "Nenhuma pesagem registrada ainda."}
      </p>

      <form
        action={registrar}
        key={pesagens.length}
        className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-edge bg-white/10 p-3"
      >
        <div className="w-28 space-y-1">
          <label htmlFor="peso-novo" className="block text-xs text-ink-muted">
            Novo peso (kg)
          </label>
          <Input
            id="peso-novo"
            name="peso"
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 4,5"
            required
          />
        </div>
        <div className="w-40 space-y-1">
          <label htmlFor="peso-data" className="block text-xs text-ink-muted">
            Data
          </label>
          <CampoData
            id="peso-data"
            name="data"
            defaultValue={hoje}
            min="1980-01-01"
            max={hoje}
            required
          />
        </div>
        <SubmitButton variante="secondary" carregando="Registrando…">
          Registrar
        </SubmitButton>
      </form>

      {pesagens.length > 0 && (
        <ul className="mt-3 divide-y divide-white/15">
          {pesagens.map((p, i) => {
            const antes = pesagens[i + 1];
            const v = antes ? variacao(p.peso, antes.peso) : null;
            const excluir = excluirPesagem.bind(null, p.id, petId);
            return (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink tabular-nums">
                    {formatPeso(p.peso)}
                    <span className="ml-2 font-normal text-ink-muted">
                      {formatDataISO(p.data)}
                    </span>
                  </p>
                  {(v || p.observacao) && (
                    <p className="flex items-center gap-1 truncate text-xs text-ink-muted">
                      {v && v.delta !== 0 && (
                        <>
                          {v.delta > 0 ? (
                            <TrendingUp className="size-3.5 shrink-0" aria-hidden />
                          ) : (
                            <TrendingDown className="size-3.5 shrink-0" aria-hidden />
                          )}
                          {v.texto}
                        </>
                      )}
                      {v && v.delta !== 0 && p.observacao ? " · " : ""}
                      {p.observacao}
                    </p>
                  )}
                </div>
                <form action={excluir} className="shrink-0">
                  <ConfirmButton
                    variante="ghost"
                    tamanho="sm"
                    mensagem="Excluir esta pesagem? O peso atual do pet volta para a pesagem anterior."
                    aria-label={`Excluir pesagem de ${formatDataISO(p.data)}`}
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
    </Card>
  );
}
