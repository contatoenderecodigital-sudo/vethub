"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { Campo, Select, Textarea } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import type { Consulta } from "@/lib/types";
import { consultaSchema, type ConsultaFormValores } from "./consulta-schema";

type CamposConsulta = Pick<
  Consulta,
  | "veterinario_id"
  | "queixa"
  | "anamnese"
  | "exame_fisico"
  | "diagnostico"
  | "conduta"
  | "observacoes"
>;

/**
 * Formulário compartilhado entre criar e editar consulta, com validação em
 * tempo real (react-hook-form + zod). O pet é obrigatório e ao menos um
 * campo clínico precisa de conteúdo; o botão Salvar fica desabilitado
 * enquanto o form estiver inválido. O servidor revalida com o mesmo schema.
 */
export function ConsultaForm({
  action,
  consulta,
  veterinarios,
  vetPadrao,
  petInicial,
  agendamentoId,
  cancelarHref,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  consulta?: CamposConsulta;
  veterinarios: { id: string; nome: string }[];
  vetPadrao?: string;
  petInicial?: OpcaoBusca;
  agendamentoId?: string;
  cancelarHref: string;
  erro?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<ConsultaFormValores>({
    resolver: zodResolver(consultaSchema),
    mode: "onChange",
    defaultValues: {
      pet_id: petInicial?.id ?? "",
      veterinario_id: consulta?.veterinario_id ?? vetPadrao ?? "",
      queixa: consulta?.queixa ?? "",
      anamnese: consulta?.anamnese ?? "",
      exame_fisico: consulta?.exame_fisico ?? "",
      diagnostico: consulta?.diagnostico ?? "",
      conduta: consulta?.conduta ?? "",
      observacoes: consulta?.observacoes ?? "",
    },
  });

  async function aoEnviar(valores: ConsultaFormValores) {
    setEnviando(true);
    try {
      const fd = new FormData();
      Object.entries(valores).forEach(([campo, valor]) => fd.set(campo, valor));
      if (agendamentoId) fd.set("agendamento_id", agendamentoId);
      await action(fd); // server action revalida com o mesmo schema zod
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Pet" htmlFor="pet_id" obrigatorio erro={errors.pet_id?.message}>
          <BuscaCombobox
            id="pet_id"
            name="pet_id"
            endpoint="/api/busca/pets"
            placeholder="Buscar pet pelo nome…"
            valorInicial={petInicial}
            obrigatorio
            aoSelecionar={(opcao) =>
              setValue("pet_id", opcao?.id ?? "", { shouldValidate: true })
            }
          />
        </Campo>
        <Campo rotulo="Veterinário" htmlFor="veterinario_id">
          <Select id="veterinario_id" {...register("veterinario_id")}>
            <option value="">— Sem veterinário —</option>
            {veterinarios.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <Campo rotulo="Queixa" htmlFor="queixa">
        <Textarea
          id="queixa"
          placeholder="Motivo da consulta relatado pelo tutor…"
          {...register("queixa")}
        />
      </Campo>

      <Campo rotulo="Anamnese" htmlFor="anamnese">
        <Textarea
          id="anamnese"
          placeholder="Histórico, alimentação, vacinas, ambiente…"
          {...register("anamnese")}
        />
      </Campo>

      <Campo rotulo="Exame físico" htmlFor="exame_fisico">
        <Textarea
          id="exame_fisico"
          placeholder="Temperatura, FC, FR, mucosas, palpação…"
          {...register("exame_fisico")}
        />
      </Campo>

      <Campo rotulo="Diagnóstico" htmlFor="diagnostico">
        <Textarea id="diagnostico" {...register("diagnostico")} />
      </Campo>

      <Campo rotulo="Conduta" htmlFor="conduta">
        <Textarea
          id="conduta"
          placeholder="Tratamento, prescrição, orientações…"
          {...register("conduta")}
        />
      </Campo>

      <Campo rotulo="Observações" htmlFor="observacoes">
        <Textarea id="observacoes" {...register("observacoes")} />
      </Campo>

      {errors.root?.message && (
        <p className="text-sm font-medium text-red-100" role="alert">
          {errors.root.message}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!isValid || enviando}>
          <Check className="size-4" />
          {enviando ? "Salvando…" : "Salvar"}
        </Button>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
