"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus } from "lucide-react";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { Button, ButtonLink } from "@/components/ui/button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { TIPOS_AGENDAMENTO, type Usuario } from "@/lib/types";
import { agendamentoSchema, type AgendamentoFormValores } from "./schema";
import { useEnvioComAviso } from "@/components/ui/envio-formulario";

/**
 * Formulário de novo agendamento com validação em tempo real
 * (react-hook-form + zod). O botão Agendar fica desabilitado enquanto
 * houver campo inválido. O servidor revalida tudo com o mesmo schema.
 */
export function AgendamentoForm({
  action,
  veterinarios,
  petInicial,
  dataInicial,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  veterinarios: Pick<Usuario, "id" | "nome">[];
  petInicial?: OpcaoBusca;
  dataInicial: string;
  erro?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const form = useForm<AgendamentoFormValores>({
    resolver: zodResolver(agendamentoSchema),
    mode: "onChange",
    defaultValues: {
      pet_id: petInicial?.id ?? "",
      veterinario_id: "",
      data: dataInicial,
      hora: "",
      tipo: "consulta",
      observacoes: "",
    },
  });

  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = form;

  // Botão sempre clicável: quem clica com erro recebe o resumo e é
  // levado ao primeiro campo, em vez de encarar um botão apagado.
  const { enviar, aviso } = useEnvioComAviso(form, aoEnviar);

  // useWatch (e não watch()) para o React Compiler conseguir otimizar o form
  const data = useWatch({ control, name: "data" });

  async function aoEnviar(valores: AgendamentoFormValores) {
    setEnviando(true);
    try {
      const fd = new FormData();
      Object.entries(valores).forEach(([campo, valor]) => fd.set(campo, valor));
      await action(fd); // server action revalida com zod e redireciona
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
        {aviso}
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <Campo rotulo="Pet" htmlFor="pet_id" obrigatorio erro={errors.pet_id?.message}>
        {/* fonte da verdade do pet_id para o RHF/FormData */}
        <input type="hidden" {...register("pet_id")} />
        <BuscaCombobox
          id="pet_id"
          name="pet_id"
          endpoint="/api/busca/pets"
          placeholder="Busque o pet pelo nome…"
          valorInicial={petInicial}
          aoSelecionar={(opcao) =>
            setValue("pet_id", opcao?.id ?? "", { shouldValidate: true })
          }
        />
      </Campo>

      <Campo
        rotulo="Veterinário"
        htmlFor="veterinario_id"
        erro={errors.veterinario_id?.message}
      >
        <Select id="veterinario_id" {...register("veterinario_id")}>
          <option value="">Sem preferência</option>
          {veterinarios.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nome}
            </option>
          ))}
        </Select>
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data" htmlFor="data" obrigatorio erro={errors.data?.message}>
          {/* fonte da verdade da data para o RHF/FormData */}
          <input type="hidden" {...register("data")} />
          <CampoData
            id="data"
            value={data ?? ""}
            onChange={(iso) => setValue("data", iso, { shouldValidate: true })}
            min="2020-01-01"
            max={`${new Date().getFullYear() + 5}-12-31`}
            aria-invalid={!!errors.data}
          />
        </Campo>
        <Campo rotulo="Hora" htmlFor="hora" obrigatorio erro={errors.hora?.message}>
          <Input
            id="hora"
            type="time"
            aria-invalid={!!errors.hora}
            {...register("hora")}
          />
        </Campo>
      </div>

      <Campo rotulo="Tipo" htmlFor="tipo" obrigatorio erro={errors.tipo?.message}>
        <Select id="tipo" aria-invalid={!!errors.tipo} {...register("tipo")}>
          {TIPOS_AGENDAMENTO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo
        rotulo="Observações"
        htmlFor="observacoes"
        erro={errors.observacoes?.message}
      >
        <Textarea
          id="observacoes"
          placeholder="Ex.: chegar 10 min antes, pet em jejum…"
          {...register("observacoes")}
        />
      </Campo>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={enviando}>
          <CalendarPlus className="size-4" />
          {enviando ? "Agendando…" : "Agendar"}
        </Button>
        <ButtonLink href="/agenda" variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
