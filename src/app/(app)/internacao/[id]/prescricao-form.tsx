"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pill } from "lucide-react";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { prescricaoSchema, type PrescricaoFormValores } from "../schema";
import { VIAS } from "../tipos";
import { useEnvioComAviso } from "@/components/ui/envio-formulario";

const VAZIO: PrescricaoFormValores = {
  medicamento: "",
  dose: "",
  via: "",
  frequencia_horas: "",
  horarios: "",
  dias: "",
  observacao: "",
};

/**
 * Nova prescrição, inline no painel do paciente. Os horários informados
 * viram automaticamente o checklist das próximas 48 h (server action).
 */
export function PrescricaoForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);

  const form = useForm<PrescricaoFormValores>({
    resolver: zodResolver(prescricaoSchema),
    mode: "onChange",
    defaultValues: VAZIO,
  });

  const {
    register,
    reset,
    formState: { errors },
  } = form;

  // Botão sempre clicável: quem clica com erro recebe o resumo e é
  // levado ao primeiro campo, em vez de encarar um botão apagado.
  const { enviar, aviso } = useEnvioComAviso(form, aoEnviar);

  async function aoEnviar(valores: PrescricaoFormValores) {
    setEnviando(true);
    try {
      const fd = new FormData();
      Object.entries(valores).forEach(([campo, valor]) => fd.set(campo, valor));
      await action(fd);
      reset(VAZIO);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="mb-4 space-y-3 rounded-xl border border-white/20 bg-white/10 p-3"
      noValidate
    >
      {aviso}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4">
        <Campo
          rotulo="Medicamento"
          htmlFor="medicamento"
          obrigatorio
          erro={errors.medicamento?.message}
        >
          <Input
            id="medicamento"
            placeholder="Ex.: Dipirona"
            aria-invalid={!!errors.medicamento}
            {...register("medicamento")}
          />
        </Campo>
        <Campo rotulo="Dose" htmlFor="dose" obrigatorio erro={errors.dose?.message}>
          <Input
            id="dose"
            placeholder="Ex.: 1,2 mL"
            aria-invalid={!!errors.dose}
            {...register("dose")}
          />
        </Campo>
      </div>

      {/* Larguras mínimas por coluna + gap maior: "Frequência (h)" e
          "Duração (dias)" param de encostar uma na outra no painel estreito. */}
      <div className="grid gap-3 sm:grid-cols-[minmax(7rem,0.8fr)_minmax(9rem,1fr)_minmax(9rem,1fr)] sm:gap-x-4">
        <Campo rotulo="Via" htmlFor="via" erro={errors.via?.message}>
          <Select id="via" {...register("via")}>
            <option value="">— Não informada —</option>
            {VIAS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo
          rotulo="Frequência (h)"
          htmlFor="frequencia_horas"
          dica="A cada quantas horas"
          erro={errors.frequencia_horas?.message}
        >
          <Input
            id="frequencia_horas"
            inputMode="numeric"
            placeholder="8"
            {...register("frequencia_horas")}
          />
        </Campo>
        <Campo
          rotulo="Duração (dias)"
          htmlFor="dias"
          dica="Deixe vazio p/ contínuo"
          erro={errors.dias?.message}
        >
          <Input id="dias" inputMode="numeric" placeholder="3" {...register("dias")} />
        </Campo>
      </div>

      <Campo
        rotulo="Horários"
        htmlFor="horarios"
        dica="Separados por vírgula. Geram o checklist das próximas 48 h"
        erro={errors.horarios?.message}
      >
        <Input
          id="horarios"
          placeholder="08:00, 16:00, 00:00"
          aria-invalid={!!errors.horarios}
          {...register("horarios")}
        />
      </Campo>

      <Campo rotulo="Observação" htmlFor="observacao" erro={errors.observacao?.message}>
        <Textarea
          id="observacao"
          rows={2}
          placeholder="Ex.: diluir em 10 mL de SF, aplicar lentamente…"
          {...register("observacao")}
        />
      </Campo>

      <Button type="submit" tamanho="sm" disabled={enviando}>
        <Pill className="size-4" />
        {enviando ? "Salvando…" : "Adicionar prescrição"}
      </Button>
    </form>
  );
}
