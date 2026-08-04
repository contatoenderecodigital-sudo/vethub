import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { ESPECIES, type Pet } from "@/lib/types";

/** Formulário compartilhado entre criar e editar pet. */
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
  return (
    <form action={action} className="space-y-4">
      {erro && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
      )}

      <Campo rotulo="Tutor" obrigatorio>
        <BuscaCombobox
          name="tutor_id"
          endpoint="/api/busca/tutores"
          placeholder="Busque o tutor por nome, telefone ou CPF…"
          valorInicial={tutorInicial}
          obrigatorio
        />
      </Campo>

      <Campo rotulo="Nome do pet" htmlFor="nome" obrigatorio>
        <Input id="nome" name="nome" defaultValue={pet?.nome} required />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Espécie" htmlFor="especie" obrigatorio>
          <Select
            id="especie"
            name="especie"
            defaultValue={pet?.especie ?? ""}
            required
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
        <Campo rotulo="Raça" htmlFor="raca">
          <Input id="raca" name="raca" defaultValue={pet?.raca ?? ""} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Sexo" htmlFor="sexo">
          <Select id="sexo" name="sexo" defaultValue={pet?.sexo ?? ""}>
            <option value="">Não informado</option>
            <option value="macho">Macho</option>
            <option value="femea">Fêmea</option>
          </Select>
        </Campo>
        <Campo rotulo="Data de nascimento" htmlFor="data_nascimento">
          <Input
            id="data_nascimento"
            name="data_nascimento"
            type="date"
            defaultValue={pet?.data_nascimento ?? ""}
          />
        </Campo>
      </div>

      <Campo rotulo="Peso (kg)" htmlFor="peso" dica="Use vírgula para decimais, ex.: 4,5">
        <Input
          id="peso"
          name="peso"
          type="text"
          inputMode="decimal"
          placeholder="Ex.: 4,5"
          defaultValue={
            pet?.peso != null ? String(pet.peso).replace(".", ",") : ""
          }
          className="max-w-40"
        />
      </Campo>

      <label className="flex items-start gap-2 rounded-lg border border-edge bg-zinc-50 p-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          name="castrado"
          defaultChecked={pet?.castrado}
          className="mt-0.5 size-4 accent-[#059669]"
        />
        <span>O pet é castrado.</span>
      </label>

      <Campo rotulo="Observações" htmlFor="observacoes">
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={pet?.observacoes ?? ""}
          placeholder="Alergias, comportamento, cuidados especiais…"
        />
      </Campo>

      <div className="flex gap-2 pt-2">
        <SubmitButton>Salvar</SubmitButton>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
