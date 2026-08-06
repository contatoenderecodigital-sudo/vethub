"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NotebookPen } from "lucide-react";
import { Campo, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { evolucaoSchema, type EvolucaoFormValores } from "../schema";
import { useEnvioComAviso } from "@/components/ui/envio-formulario";

const VAZIO: EvolucaoFormValores = {
  texto: "",
  temperatura: "",
  frequencia_cardiaca: "",
  frequencia_respiratoria: "",
};

/**
 * Registro rápido de evolução, inline no painel do paciente.
 * Valida com o mesmo schema zod que a server action revalida no servidor.
 */
export function EvolucaoForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);

  const form = useForm<EvolucaoFormValores>({
    resolver: zodResolver(evolucaoSchema),
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

  async function aoEnviar(valores: EvolucaoFormValores) {
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
      <Campo rotulo="Nova evolução" htmlFor="texto" obrigatorio erro={errors.texto?.message}>
        <Textarea
          id="texto"
          rows={3}
          placeholder="Estado geral, apetite, hidratação, resposta ao tratamento…"
          aria-invalid={!!errors.texto}
          {...register("texto")}
        />
      </Campo>

      <div className="grid gap-3 sm:grid-cols-3">
        <Campo
          rotulo="Temperatura (°C)"
          htmlFor="temperatura"
          erro={errors.temperatura?.message}
        >
          <Input
            id="temperatura"
            inputMode="decimal"
            placeholder="38,5"
            {...register("temperatura")}
          />
        </Campo>
        <Campo
          rotulo="FC (bpm)"
          htmlFor="frequencia_cardiaca"
          erro={errors.frequencia_cardiaca?.message}
        >
          <Input
            id="frequencia_cardiaca"
            inputMode="numeric"
            placeholder="120"
            {...register("frequencia_cardiaca")}
          />
        </Campo>
        <Campo
          rotulo="FR (mpm)"
          htmlFor="frequencia_respiratoria"
          erro={errors.frequencia_respiratoria?.message}
        >
          <Input
            id="frequencia_respiratoria"
            inputMode="numeric"
            placeholder="24"
            {...register("frequencia_respiratoria")}
          />
        </Campo>
      </div>

      <Button type="submit" tamanho="sm" disabled={enviando}>
        <NotebookPen className="size-4" />
        {enviando ? "Registrando…" : "Registrar evolução"}
      </Button>
    </form>
  );
}
