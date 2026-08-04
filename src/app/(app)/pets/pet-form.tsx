"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { ESPECIES, type Pet } from "@/lib/types";
import { petSchema, sanitizarPeso, type PetFormValores } from "./schema";

/**
 * Formulário de pet (criar/editar) com validação em tempo real
 * (react-hook-form + zod). O peso bloqueia caracteres não numéricos na
 * digitação; o botão Salvar fica desabilitado enquanto houver campo
 * inválido. O servidor revalida tudo com o mesmo schema.
 */
export function PetForm({
  action,
  pet,
  tutorInicial,
  cancelarHref,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  pet?: Pet;
  tutorInicial?: OpcaoBusca;
  cancelarHref: string;
  erro?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<PetFormValores>({
    resolver: zodResolver(petSchema),
    mode: "onChange",
    defaultValues: {
      tutor_id: pet?.tutor_id ?? tutorInicial?.id ?? "",
      nome: pet?.nome ?? "",
      especie: pet?.especie ?? "",
      raca: pet?.raca ?? "",
      sexo: pet?.sexo ?? "",
      data_nascimento: pet?.data_nascimento ?? "",
      peso: pet?.peso != null ? String(pet.peso).replace(".", ",") : "",
      castrado: pet?.castrado ?? false,
      observacoes: pet?.observacoes ?? "",
    },
  });

  async function aoEnviar(valores: PetFormValores) {
    setEnviando(true);
    try {
      const fd = new FormData();
      Object.entries(valores).forEach(([campo, valor]) =>
        fd.set(campo, typeof valor === "boolean" ? (valor ? "on" : "") : valor)
      );
      await action(fd); // server action revalida com zod e redireciona
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
      {erro && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
      )}

      <Campo rotulo="Tutor" obrigatorio erro={errors.tutor_id?.message}>
        {/* fonte da verdade do tutor_id para o RHF/FormData */}
        <input type="hidden" {...register("tutor_id")} />
        <BuscaCombobox
          name="tutor_id"
          endpoint="/api/busca/tutores"
          placeholder="Busque o tutor por nome, telefone ou CPF…"
          valorInicial={tutorInicial}
          aoSelecionar={(opcao) =>
            setValue("tutor_id", opcao?.id ?? "", { shouldValidate: true })
          }
        />
      </Campo>

      <Campo
        rotulo="Nome do pet"
        htmlFor="nome"
        obrigatorio
        erro={errors.nome?.message}
      >
        <Input id="nome" aria-invalid={!!errors.nome} {...register("nome")} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Espécie"
          htmlFor="especie"
          obrigatorio
          erro={errors.especie?.message}
        >
          <Select
            id="especie"
            aria-invalid={!!errors.especie}
            {...register("especie")}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {ESPECIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Raça" htmlFor="raca" erro={errors.raca?.message}>
          <Input id="raca" {...register("raca")} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Sexo" htmlFor="sexo" erro={errors.sexo?.message}>
          <Select id="sexo" {...register("sexo")}>
            <option value="">Não informado</option>
            <option value="macho">Macho</option>
            <option value="femea">Fêmea</option>
          </Select>
        </Campo>
        <Campo
          rotulo="Data de nascimento"
          htmlFor="data_nascimento"
          erro={errors.data_nascimento?.message}
        >
          <Input
            id="data_nascimento"
            type="date"
            aria-invalid={!!errors.data_nascimento}
            {...register("data_nascimento")}
          />
        </Campo>
      </div>

      <Campo
        rotulo="Peso (kg)"
        htmlFor="peso"
        dica="Use vírgula para decimais, ex.: 4,5"
        erro={errors.peso?.message}
      >
        <Input
          id="peso"
          type="text"
          inputMode="decimal"
          placeholder="Ex.: 4,5"
          className="max-w-40"
          aria-invalid={!!errors.peso}
          {...register("peso", {
            onChange: (e) =>
              setValue("peso", sanitizarPeso(e.target.value), {
                shouldValidate: true,
              }),
          })}
        />
      </Campo>

      <label className="flex items-start gap-2 rounded-lg border border-edge bg-zinc-50 p-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[#059669]"
          {...register("castrado")}
        />
        <span>O pet é castrado.</span>
      </label>

      <Campo
        rotulo="Observações"
        htmlFor="observacoes"
        erro={errors.observacoes?.message}
      >
        <Textarea
          id="observacoes"
          placeholder="Alergias, comportamento, cuidados especiais…"
          {...register("observacoes")}
        />
      </Campo>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!isValid || enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </Button>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
