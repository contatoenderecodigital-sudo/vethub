"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BedDouble, Check } from "lucide-react";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { internacaoSchema, type InternacaoFormValores } from "./schema";

/**
 * Formulário de internação, compartilhado entre internar e editar.
 * Validação em tempo real (react-hook-form + zod); o servidor revalida
 * com o mesmo schema. Na edição o pet não muda.
 */
export function InternacaoForm({
  action,
  valoresIniciais,
  veterinarios,
  petInicial,
  edicao = false,
  cancelarHref,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  valoresIniciais: InternacaoFormValores;
  veterinarios: { id: string; nome: string }[];
  petInicial?: OpcaoBusca;
  edicao?: boolean;
  cancelarHref: string;
  erro?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<InternacaoFormValores>({
    resolver: zodResolver(internacaoSchema),
    mode: "onChange",
    defaultValues: valoresIniciais,
  });

  async function aoEnviar(valores: InternacaoFormValores) {
    setEnviando(true);
    try {
      const fd = new FormData();
      Object.entries(valores).forEach(([campo, valor]) => fd.set(campo, valor));
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

      {/* fonte da verdade do pet_id para o RHF/FormData */}
      <input type="hidden" {...register("pet_id")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Pet" obrigatorio erro={errors.pet_id?.message}>
          {edicao ? (
            <p className="flex h-10 items-center rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-ink-muted">
              {petInicial?.rotulo ?? "—"}
            </p>
          ) : (
            <BuscaCombobox
              name="pet"
              endpoint="/api/busca/pets"
              placeholder="Buscar pet pelo nome…"
              valorInicial={petInicial}
              obrigatorio
              aoSelecionar={(opcao) =>
                setValue("pet_id", opcao?.id ?? "", { shouldValidate: true })
              }
            />
          )}
        </Campo>

        <Campo
          rotulo="Veterinário responsável"
          htmlFor="veterinario_id"
          erro={errors.veterinario_id?.message}
        >
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          rotulo="Box"
          htmlFor="box"
          dica="Ex.: Box 3, Isolamento"
          erro={errors.box?.message}
        >
          <Input id="box" maxLength={20} placeholder="Box 1" {...register("box")} />
        </Campo>
        <Campo
          rotulo="Data de entrada"
          htmlFor="data"
          obrigatorio
          erro={errors.data?.message}
        >
          <Input
            id="data"
            type="date"
            min="2020-01-01"
            max={`${new Date().getFullYear() + 5}-12-31`}
            aria-invalid={!!errors.data}
            {...register("data")}
          />
        </Campo>
        <Campo
          rotulo="Hora de entrada"
          htmlFor="hora"
          obrigatorio
          erro={errors.hora?.message}
        >
          <Input
            id="hora"
            type="time"
            aria-invalid={!!errors.hora}
            {...register("hora")}
          />
        </Campo>
      </div>

      <Campo
        rotulo="Motivo da internação"
        htmlFor="motivo"
        obrigatorio
        erro={errors.motivo?.message}
      >
        <Textarea
          id="motivo"
          placeholder="Ex.: gastroenterite hemorrágica, pós-operatório de OSH…"
          aria-invalid={!!errors.motivo}
          {...register("motivo")}
        />
      </Campo>

      {edicao && (
        <Campo
          rotulo="Diagnóstico"
          htmlFor="diagnostico"
          erro={errors.diagnostico?.message}
        >
          <Textarea id="diagnostico" {...register("diagnostico")} />
        </Campo>
      )}

      <Campo
        rotulo="Observações"
        htmlFor="observacoes"
        erro={errors.observacoes?.message}
      >
        <Textarea
          id="observacoes"
          placeholder="Dieta, cuidados especiais, contato do tutor…"
          {...register("observacoes")}
        />
      </Campo>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!isValid || enviando}>
          {edicao ? <Check className="size-4" /> : <BedDouble className="size-4" />}
          {enviando ? "Salvando…" : edicao ? "Salvar" : "Internar"}
        </Button>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
