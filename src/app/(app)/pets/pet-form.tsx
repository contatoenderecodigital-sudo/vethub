"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { ESPECIES, PORTES, type Pet } from "@/lib/types";
import { hojeISOValidacao } from "@/lib/validacao";
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
      porte: pet?.porte ?? "",
      pelagem: pet?.pelagem ?? "",
      microchip: pet?.microchip ?? "",
      data_nascimento: pet?.data_nascimento ?? "",
      peso: pet?.peso != null ? String(pet.peso).replace(".", ",") : "",
      castrado: pet?.castrado ?? false,
      falecido: pet?.falecido ?? false,
      alergias: pet?.alergias ?? "",
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
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
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
            min="1980-01-01"
            max={hojeISOValidacao()}
            aria-invalid={!!errors.data_nascimento}
            {...register("data_nascimento")}
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Porte" htmlFor="porte" erro={errors.porte?.message}>
          <Select id="porte" {...register("porte")}>
            <option value="">Não informado</option>
            {PORTES.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Pelagem" htmlFor="pelagem" erro={errors.pelagem?.message}>
          <Input
            id="pelagem"
            placeholder="Ex.: Caramelo curta"
            aria-invalid={!!errors.pelagem}
            {...register("pelagem")}
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            aria-invalid={!!errors.peso}
            {...register("peso", {
              onChange: (e) =>
                setValue("peso", sanitizarPeso(e.target.value), {
                  shouldValidate: true,
                }),
            })}
          />
        </Campo>
        <Campo
          rotulo="Microchip"
          htmlFor="microchip"
          dica="Número gravado no chip de identificação"
          erro={errors.microchip?.message}
        >
          <Input
            id="microchip"
            inputMode="numeric"
            placeholder="Ex.: 981020000123456"
            aria-invalid={!!errors.microchip}
            {...register("microchip")}
          />
        </Campo>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-white/25 bg-white/10 p-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[#34D399]"
          {...register("castrado")}
        />
        <span>O pet é castrado.</span>
      </label>

      <Campo
        rotulo="Alergias"
        htmlFor="alergias"
        dica="Aparece em destaque no topo da ficha, para o vet ver antes de medicar."
        erro={errors.alergias?.message}
      >
        <Textarea
          id="alergias"
          className="min-h-20"
          placeholder="Ex.: alergia a dipirona e a carrapaticida com permetrina"
          aria-invalid={!!errors.alergias}
          {...register("alergias")}
        />
      </Campo>

      <Campo
        rotulo="Observações"
        htmlFor="observacoes"
        erro={errors.observacoes?.message}
      >
        <Textarea
          id="observacoes"
          placeholder="Comportamento, cuidados especiais, preferências…"
          {...register("observacoes")}
        />
      </Campo>

      <label className="flex items-start gap-2 text-xs text-ink-muted">
        <input
          type="checkbox"
          className="mt-0.5 size-3.5 accent-[#34D399]"
          {...register("falecido")}
        />
        <span>Registrar o pet como falecido (some dos lembretes e da rotina).</span>
      </label>

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
