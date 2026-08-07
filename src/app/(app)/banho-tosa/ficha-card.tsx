import { Pencil, Scissors, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitulo } from "@/components/ui/card";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { salvarFicha } from "./actions";
import {
  rotuloTipoTosa,
  temperamentoInfo,
  TEMPERAMENTOS,
  TIPOS_TOSA,
  type FichaBanhoTosa,
} from "./schema";

/** Linha rótulo/valor da ficha. */
function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{rotulo}</dt>
      <dd className="text-right font-medium text-ink">{valor || "-"}</dd>
    </div>
  );
}

/**
 * Ficha de preferências do pet (tipo de tosa, shampoo, restrições…).
 * É a mesma em todo lugar: painel de execução, tela da ficha e prontuário.
 * Sem ficha, o formulário já abre aberto para o petshop cadastrar na hora.
 */
export function FichaCard({
  petId,
  petNome,
  ficha,
  destino,
}: {
  petId: string;
  petNome: string;
  ficha: FichaBanhoTosa | null;
  /** Para onde voltar depois de salvar (rota interna). */
  destino: string;
}) {
  const salvar = salvarFicha.bind(null, petId, destino);
  const temperamento = temperamentoInfo(ficha?.temperamento);

  return (
    <Card>
      <CardTitulo className="flex items-center gap-2">
        <Scissors className="size-4 text-ink-muted" aria-hidden />
        Ficha do pet
      </CardTitulo>

      {ficha ? (
        <>
          {(ficha.restricoes || temperamento?.alerta) && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-300/25 px-3 py-2.5"
            >
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-amber-50"
                aria-hidden
              />
              <div className="min-w-0 text-sm text-amber-50">
                <p className="font-semibold uppercase tracking-wide">Atenção</p>
                {temperamento?.alerta && (
                  <p className="mt-0.5 font-medium">
                    Temperamento: {temperamento.rotulo}
                  </p>
                )}
                {ficha.restricoes && (
                  <p className="mt-0.5 whitespace-pre-line">{ficha.restricoes}</p>
                )}
              </div>
            </div>
          )}

          <dl className="space-y-2 text-sm">
            <Linha rotulo="Tipo de tosa" valor={rotuloTipoTosa(ficha.tipo_tosa)} />
            <Linha rotulo="Altura da máquina" valor={ficha.altura_maquina} />
            <Linha rotulo="Shampoo" valor={ficha.shampoo} />
            <Linha rotulo="Perfume" valor={ficha.perfume} />
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Temperamento</dt>
              <dd>
                {temperamento ? (
                  <Badge tom={temperamento.alerta ? "pending" : "success"}>
                    {temperamento.rotulo}
                  </Badge>
                ) : (
                  <span className="font-medium text-ink">-</span>
                )}
              </dd>
            </div>
            {ficha.observacoes && (
              <div className="pt-1">
                <dt className="text-ink-muted">Observações</dt>
                <dd className="mt-1 whitespace-pre-line font-medium text-ink">
                  {ficha.observacoes}
                </dd>
              </div>
            )}
          </dl>
        </>
      ) : (
        <p className="text-sm text-ink-muted">
          {petNome} ainda não tem ficha de banho e tosa. Preencha abaixo para a
          equipe saber como o pet gosta de ser atendido.
        </p>
      )}

      <details
        open={!ficha}
        className="mt-4 rounded-xl border border-white/25 bg-white/10"
      >
        <summary className="min-h-11 cursor-pointer list-none px-3 py-3 text-sm font-medium text-ink">
          <span className="inline-flex items-center gap-2">
            <Pencil className="size-4" aria-hidden />
            {ficha ? "Editar preferências" : "Criar ficha do pet"}
          </span>
        </summary>

        <form action={salvar} className="space-y-3 border-t border-white/20 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Tipo de tosa" htmlFor="ficha-tipo-tosa">
              <Select
                id="ficha-tipo-tosa"
                name="tipo_tosa"
                defaultValue={ficha?.tipo_tosa ?? ""}
                className="min-h-11"
              >
                <option value="">Não informado</option>
                {TIPOS_TOSA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </Select>
            </Campo>

            <Campo
              rotulo="Altura da máquina"
              htmlFor="ficha-altura"
              dica="Ex.: nº 1, nº 3, tesoura"
            >
              <Input
                id="ficha-altura"
                name="altura_maquina"
                defaultValue={ficha?.altura_maquina ?? ""}
                maxLength={20}
                placeholder="nº 2"
                className="min-h-11"
              />
            </Campo>

            <Campo rotulo="Shampoo" htmlFor="ficha-shampoo">
              <Input
                id="ficha-shampoo"
                name="shampoo"
                defaultValue={ficha?.shampoo ?? ""}
                maxLength={60}
                placeholder="Ex.: hipoalergênico"
                className="min-h-11"
              />
            </Campo>

            <Campo rotulo="Perfume" htmlFor="ficha-perfume">
              <Input
                id="ficha-perfume"
                name="perfume"
                defaultValue={ficha?.perfume ?? ""}
                maxLength={60}
                placeholder="Ex.: sem perfume"
                className="min-h-11"
              />
            </Campo>
          </div>

          <Campo
            rotulo="Temperamento"
            htmlFor="ficha-temperamento"
            dica="Aparece em destaque no painel do dia."
          >
            <Select
              id="ficha-temperamento"
              name="temperamento"
              defaultValue={ficha?.temperamento ?? ""}
              className="min-h-11"
            >
              <option value="">Não informado</option>
              {TEMPERAMENTOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </Select>
          </Campo>

          <Campo
            rotulo="Restrições"
            htmlFor="ficha-restricoes"
            dica="Ex.: não pode secador quente, medo de máquina."
          >
            <Textarea
              id="ficha-restricoes"
              name="restricoes"
              defaultValue={ficha?.restricoes ?? ""}
              maxLength={500}
              className="min-h-20"
            />
          </Campo>

          <Campo rotulo="Observações" htmlFor="ficha-observacoes">
            <Textarea
              id="ficha-observacoes"
              name="observacoes"
              defaultValue={ficha?.observacoes ?? ""}
              maxLength={500}
              className="min-h-20"
              placeholder="Preferências do tutor, nós de sempre, laço…"
            />
          </Campo>

          <SubmitButton carregando="Salvando…" className="min-h-11">
            Salvar ficha
          </SubmitButton>
        </form>
      </details>
    </Card>
  );
}
