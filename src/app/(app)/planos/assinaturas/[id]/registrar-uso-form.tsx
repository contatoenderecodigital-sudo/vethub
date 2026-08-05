"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { hojeISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Campo, Input, Select } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { SubmitButton } from "@/components/ui/submit-button";
import { registrarUso } from "../../actions";

export interface OpcaoBeneficio {
  id: string;
  descricao: string;
  quantidade_mes: number;
  usados: number;
}

/**
 * Registro inline do consumo de um benefício. Fica recolhido até o usuário
 * pedir. O card mostra o saldo do mês sem ruído. O servidor revalida tudo
 * de novo (zod) em registrarUso.
 */
export function RegistrarUsoForm({
  assinaturaId,
  beneficios,
}: {
  assinaturaId: string;
  beneficios: OpcaoBeneficio[];
}) {
  const [aberto, setAberto] = useState(false);
  const [beneficioId, setBeneficioId] = useState("");
  const [descricao, setDescricao] = useState("");

  /** Escolher o benefício já sugere a descrição do uso. */
  function escolher(id: string) {
    setBeneficioId(id);
    const alvo = beneficios.find((b) => b.id === id);
    if (alvo && !descricao.trim()) setDescricao(alvo.descricao);
  }

  if (!aberto) {
    return (
      <Button
        type="button"
        variante="secondary"
        tamanho="sm"
        onClick={() => setAberto(true)}
      >
        <Plus className="size-4" />
        Registrar uso
      </Button>
    );
  }

  return (
    <form
      action={registrarUso.bind(null, assinaturaId)}
      className="w-full rounded-xl border border-edge bg-white/10 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Registrar uso do benefício</p>
        <button
          type="button"
          aria-label="Fechar formulário"
          onClick={() => setAberto(false)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Benefício" htmlFor="uso-beneficio" className="sm:col-span-2">
          <Select
            id="uso-beneficio"
            name="beneficio_id"
            value={beneficioId}
            onChange={(e) => escolher(e.target.value)}
          >
            <option value="">Uso avulso (fora da franquia)</option>
            {beneficios.map((b) => (
              <option key={b.id} value={b.id}>
                {b.descricao} · {b.usados} de {b.quantidade_mes} usados
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Descrição" htmlFor="uso-descricao" obrigatorio>
          <Input
            id="uso-descricao"
            name="descricao"
            required
            maxLength={200}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Banho do Thor"
          />
        </Campo>

        <Campo rotulo="Data" htmlFor="uso-data" obrigatorio>
          <CampoData
            id="uso-data"
            name="data"
            required
            defaultValue={hojeISO()}
          />
        </Campo>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SubmitButton tamanho="sm">Registrar</SubmitButton>
        <Button
          type="button"
          variante="ghost"
          tamanho="sm"
          onClick={() => setAberto(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
