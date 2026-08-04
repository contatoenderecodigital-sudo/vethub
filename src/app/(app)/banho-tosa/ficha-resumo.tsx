import { Bath, Pencil, Plus, TriangleAlert } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { rotuloTipoTosa, temperamentoInfo, type FichaBanhoTosa } from "./schema";

/**
 * Resumo da ficha de banho e tosa dentro do prontuário do pet.
 * Mostra as preferências principais e leva para a edição completa.
 */
export async function FichaBanhoTosaResumo({ petId }: { petId: string }) {
  const { supabase } = await getSessao();

  const { data: ficha } = await supabase
    .from("ficha_banho_tosa")
    .select(
      "id, pet_id, tipo_tosa, altura_maquina, shampoo, perfume, observacoes, restricoes, temperamento, updated_at"
    )
    .eq("pet_id", petId)
    .maybeSingle<FichaBanhoTosa>();

  const temperamento = temperamentoInfo(ficha?.temperamento);
  const tosa = rotuloTipoTosa(ficha?.tipo_tosa);

  return (
    <Card>
      <CardTitulo className="flex items-center gap-2">
        <Bath className="size-4 text-ink-muted" aria-hidden />
        Banho e tosa
      </CardTitulo>

      {ficha ? (
        <>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Tipo de tosa</dt>
              <dd className="text-right font-medium text-ink">{tosa ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Altura da máquina</dt>
              <dd className="text-right font-medium text-ink">
                {ficha.altura_maquina ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Shampoo</dt>
              <dd className="text-right font-medium text-ink">
                {ficha.shampoo ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Perfume</dt>
              <dd className="text-right font-medium text-ink">
                {ficha.perfume ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Temperamento</dt>
              <dd>
                {temperamento ? (
                  <Badge tom={temperamento.alerta ? "pending" : "success"}>
                    {temperamento.rotulo}
                  </Badge>
                ) : (
                  <span className="font-medium text-ink">—</span>
                )}
              </dd>
            </div>
          </dl>

          {ficha.restricoes && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-300/25 px-3 py-2 text-sm font-medium text-amber-50">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="min-w-0 whitespace-pre-line">{ficha.restricoes}</span>
            </p>
          )}

          <div className="mt-4">
            <ButtonLink
              href={`/banho-tosa/fichas/${petId}`}
              variante="secondary"
              tamanho="sm"
              className="min-h-11"
            >
              <Pencil className="size-4" />
              Editar ficha
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            Sem ficha de banho e tosa. Cadastre as preferências (tipo de tosa,
            shampoo, restrições) para a equipe atender do jeito certo.
          </p>
          <div className="mt-4">
            <ButtonLink
              href={`/banho-tosa/fichas/${petId}`}
              variante="secondary"
              tamanho="sm"
              className="min-h-11"
            >
              <Plus className="size-4" />
              Criar ficha
            </ButtonLink>
          </div>
        </>
      )}
    </Card>
  );
}
