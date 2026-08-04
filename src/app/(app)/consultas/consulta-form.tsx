import { Check } from "lucide-react";
import { Campo, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import type { Consulta } from "@/lib/types";

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

/** Formulário compartilhado entre criar e editar consulta. */
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
  return (
    <form action={action} className="space-y-4">
      {erro && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      {agendamentoId && (
        <input type="hidden" name="agendamento_id" value={agendamentoId} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Pet" obrigatorio>
          <BuscaCombobox
            name="pet_id"
            endpoint="/api/busca/pets"
            placeholder="Buscar pet pelo nome…"
            valorInicial={petInicial}
            obrigatorio
          />
        </Campo>
        <Campo rotulo="Veterinário" htmlFor="veterinario_id">
          <Select
            id="veterinario_id"
            name="veterinario_id"
            defaultValue={consulta?.veterinario_id ?? vetPadrao ?? ""}
          >
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
          name="queixa"
          defaultValue={consulta?.queixa ?? ""}
          placeholder="Motivo da consulta relatado pelo tutor…"
        />
      </Campo>

      <Campo rotulo="Anamnese" htmlFor="anamnese">
        <Textarea
          id="anamnese"
          name="anamnese"
          defaultValue={consulta?.anamnese ?? ""}
          placeholder="Histórico, alimentação, vacinas, ambiente…"
        />
      </Campo>

      <Campo rotulo="Exame físico" htmlFor="exame_fisico">
        <Textarea
          id="exame_fisico"
          name="exame_fisico"
          defaultValue={consulta?.exame_fisico ?? ""}
          placeholder="Temperatura, FC, FR, mucosas, palpação…"
        />
      </Campo>

      <Campo rotulo="Diagnóstico" htmlFor="diagnostico">
        <Textarea
          id="diagnostico"
          name="diagnostico"
          defaultValue={consulta?.diagnostico ?? ""}
        />
      </Campo>

      <Campo rotulo="Conduta" htmlFor="conduta">
        <Textarea
          id="conduta"
          name="conduta"
          defaultValue={consulta?.conduta ?? ""}
          placeholder="Tratamento, prescrição, orientações…"
        />
      </Campo>

      <Campo rotulo="Observações" htmlFor="observacoes">
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={consulta?.observacoes ?? ""}
        />
      </Campo>

      <div className="flex gap-2 pt-2">
        <SubmitButton>
          <Check className="size-4" />
          Salvar
        </SubmitButton>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
