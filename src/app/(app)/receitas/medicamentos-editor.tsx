"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { FORMAS_FARMACEUTICAS, VIAS_ADMINISTRACAO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import {
  MAX_MEDICAMENTOS,
  MEDICAMENTO_VAZIO,
  type MedicamentoValores,
} from "./schema";

interface Linha extends MedicamentoValores {
  chave: string;
}

type CampoLinha = keyof MedicamentoValores;

const MAX_MEDICAMENTO = 160;
const MAX_CONCENTRACAO = 80;
const MAX_QUANTIDADE = 80;
const MAX_POSOLOGIA = 500;
const MAX_OBSERVACAO = 300;

const RotuloCampo = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
    {children}
  </span>
);

/**
 * Editor dinâmico dos medicamentos da receita. Mantém um input hidden
 * name="medicamentos" com o JSON das linhas para a server action, que
 * revalida tudo com o mesmo schema zod (mínimo 1 medicamento; medicamento
 * e posologia obrigatórios). Os campos obrigatórios usam `required`, o que
 * já bloqueia o submit nativo do form pai; as mensagens abaixo da linha
 * aparecem depois que o usuário toca no campo.
 */
export function MedicamentosEditor({
  medicamentosIniciais,
}: {
  medicamentosIniciais?: MedicamentoValores[];
}) {
  const novaLinha = (): Linha => ({
    chave: crypto.randomUUID(),
    ...MEDICAMENTO_VAZIO,
  });

  const [linhas, setLinhas] = useState<Linha[]>(() =>
    medicamentosIniciais && medicamentosIniciais.length > 0
      ? medicamentosIniciais.map((m) => ({ chave: crypto.randomUUID(), ...m }))
      : [novaLinha()]
  );

  // Campos já tocados (blur): erro nunca aparece no primeiro render.
  const [tocados, setTocados] = useState<Record<string, boolean>>({});

  const foiTocado = (chave: string, campo: CampoLinha) =>
    !!tocados[`${chave}:${campo}`];

  function marcarTocado(chave: string, campo: CampoLinha) {
    const id = `${chave}:${campo}`;
    setTocados((atual) => (atual[id] ? atual : { ...atual, [id]: true }));
  }

  function atualizar(chave: string, campo: CampoLinha, valor: string) {
    setLinhas((atual) =>
      atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l))
    );
  }

  function remover(chave: string) {
    setLinhas((atual) =>
      atual.length > 1 ? atual.filter((l) => l.chave !== chave) : atual
    );
  }

  const medicamentosJson = JSON.stringify(
    linhas.map((linha) => ({
      medicamento: linha.medicamento.trim(),
      concentracao: linha.concentracao.trim(),
      forma_farmaceutica: linha.forma_farmaceutica,
      quantidade: linha.quantidade.trim(),
      posologia: linha.posologia.trim(),
      via: linha.via,
      observacao: linha.observacao.trim(),
    }))
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="medicamentos" value={medicamentosJson} />

      <ul className="space-y-3">
        {linhas.map((linha, indice) => {
          const erroMedicamento =
            foiTocado(linha.chave, "medicamento") && !linha.medicamento.trim()
              ? "Informe o nome do medicamento."
              : null;
          const erroPosologia =
            foiTocado(linha.chave, "posologia") && !linha.posologia.trim()
              ? "Informe a posologia (como o tutor deve administrar)."
              : null;

          return (
            <li
              key={linha.chave}
              className="rounded-xl border border-edge bg-white/5 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Medicamento {indice + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Remover medicamento ${indice + 1}`}
                  title="Remover medicamento"
                  disabled={linhas.length === 1}
                  onClick={() => remover(linha.chave)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-red-400/25 hover:text-red-100 disabled:pointer-events-none disabled:opacity-40"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <RotuloCampo>
                    Medicamento<span className="text-red-100"> *</span>
                  </RotuloCampo>
                  <Input
                    required
                    maxLength={MAX_MEDICAMENTO}
                    placeholder="Ex.: Amoxicilina + clavulanato"
                    aria-invalid={!!erroMedicamento}
                    value={linha.medicamento}
                    onChange={(e) =>
                      atualizar(linha.chave, "medicamento", e.target.value)
                    }
                    onBlur={() => marcarTocado(linha.chave, "medicamento")}
                  />
                </label>

                <label className="block">
                  <RotuloCampo>Concentração</RotuloCampo>
                  <Input
                    maxLength={MAX_CONCENTRACAO}
                    placeholder="Ex.: 250 mg"
                    value={linha.concentracao}
                    onChange={(e) =>
                      atualizar(linha.chave, "concentracao", e.target.value)
                    }
                  />
                </label>

                <label className="block">
                  <RotuloCampo>Forma farmacêutica</RotuloCampo>
                  <Select
                    value={linha.forma_farmaceutica}
                    onChange={(e) =>
                      atualizar(linha.chave, "forma_farmaceutica", e.target.value)
                    }
                  >
                    <option value="">Não informar</option>
                    {FORMAS_FARMACEUTICAS.map((f) => (
                      <option key={f.valor} value={f.valor}>
                        {f.rotulo}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block">
                  <RotuloCampo>Quantidade</RotuloCampo>
                  <Input
                    maxLength={MAX_QUANTIDADE}
                    placeholder="Ex.: 1 caixa com 14 comprimidos"
                    value={linha.quantidade}
                    onChange={(e) =>
                      atualizar(linha.chave, "quantidade", e.target.value)
                    }
                  />
                </label>

                <label className="block">
                  <RotuloCampo>Via</RotuloCampo>
                  <Select
                    value={linha.via}
                    onChange={(e) => atualizar(linha.chave, "via", e.target.value)}
                  >
                    <option value="">Não informar</option>
                    {VIAS_ADMINISTRACAO.map((v) => (
                      <option key={v.valor} value={v.valor}>
                        {v.rotulo}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block sm:col-span-2">
                  <RotuloCampo>
                    Posologia<span className="text-red-100"> *</span>
                  </RotuloCampo>
                  <Textarea
                    required
                    rows={2}
                    maxLength={MAX_POSOLOGIA}
                    className="min-h-16"
                    placeholder="1 comprimido a cada 12 horas por 7 dias"
                    aria-invalid={!!erroPosologia}
                    value={linha.posologia}
                    onChange={(e) =>
                      atualizar(linha.chave, "posologia", e.target.value)
                    }
                    onBlur={() => marcarTocado(linha.chave, "posologia")}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <RotuloCampo>Observação</RotuloCampo>
                  <Input
                    maxLength={MAX_OBSERVACAO}
                    placeholder="Ex.: administrar junto com a alimentação"
                    value={linha.observacao}
                    onChange={(e) =>
                      atualizar(linha.chave, "observacao", e.target.value)
                    }
                  />
                </label>
              </div>

              {(erroMedicamento || erroPosologia) && (
                <p className="mt-2 text-xs font-medium text-red-100" role="alert">
                  {erroMedicamento ?? erroPosologia}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
        <Button
          type="button"
          variante="secondary"
          tamanho="sm"
          disabled={linhas.length >= MAX_MEDICAMENTOS}
          onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
        >
          <Plus className="size-4" />
          Adicionar medicamento
        </Button>
        <span className="text-xs text-ink-muted">
          {linhas.length} de {MAX_MEDICAMENTOS}
        </span>
      </div>
    </div>
  );
}
