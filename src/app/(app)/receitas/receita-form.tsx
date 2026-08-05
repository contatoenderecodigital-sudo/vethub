import { Check } from "lucide-react";
import { hojeISO } from "@/lib/format";
import { TIPOS_RECEITA, type ReceitaTipo } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { MedicamentosEditor } from "./medicamentos-editor";
import type { MedicamentoValores } from "./schema";

export interface ReceitaCabecalho {
  veterinario_id: string | null;
  tipo: ReceitaTipo;
  data: string;
  orientacoes: string | null;
  retorno_em: string | null;
}

const DATA_MIN = "2020-01-01";
const DATA_MAX = `${new Date().getFullYear() + 5}-12-31`;

/**
 * Formulário compartilhado entre criar e editar receita. Os campos
 * obrigatórios usam validação nativa (required) e a server action revalida
 * tudo com o schema zod — inclusive o JSON dos medicamentos.
 */
export function ReceitaForm({
  action,
  receita,
  medicamentos,
  veterinarios,
  vetPadrao,
  petInicial,
  consultaId,
  cancelarHref,
  textoBotao = "Salvar receita",
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  receita?: ReceitaCabecalho;
  medicamentos?: MedicamentoValores[];
  veterinarios: { id: string; nome: string }[];
  vetPadrao?: string;
  petInicial?: OpcaoBusca;
  consultaId?: string;
  cancelarHref: string;
  textoBotao?: string;
  erro?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100" role="alert">
          {erro}
        </p>
      )}

      {consultaId && <input type="hidden" name="consulta_id" value={consultaId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Pet" htmlFor="pet_id" obrigatorio>
          <BuscaCombobox
            id="pet_id"
            name="pet_id"
            endpoint="/api/busca/pets"
            placeholder="Buscar pet pelo nome…"
            valorInicial={petInicial}
            obrigatorio
          />
        </Campo>

        <Campo
          rotulo="Veterinário"
          htmlFor="veterinario_id"
          dica="O CRMV ainda não é cadastrado no VetHub — no documento impresso a linha do carimbo fica em branco para o preenchimento manual."
        >
          <Select
            id="veterinario_id"
            name="veterinario_id"
            defaultValue={receita?.veterinario_id ?? vetPadrao ?? ""}
          >
            <option value="">— Sem veterinário —</option>
            {veterinarios.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Tipo de receita" htmlFor="tipo" obrigatorio>
          <Select id="tipo" name="tipo" defaultValue={receita?.tipo ?? "simples"}>
            {TIPOS_RECEITA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo} — {t.dica}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Data" htmlFor="data" obrigatorio>
          <Input
            id="data"
            name="data"
            type="date"
            required
            min={DATA_MIN}
            max={DATA_MAX}
            defaultValue={receita?.data ?? hojeISO()}
          />
        </Campo>
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-ink">
          Medicamentos<span className="text-red-100"> *</span>
        </span>
        <MedicamentosEditor medicamentosIniciais={medicamentos} />
      </div>

      <Campo
        rotulo="Orientações gerais"
        htmlFor="orientacoes"
        dica="Cuidados, alimentação, sinais de alerta — sai impresso abaixo dos medicamentos."
      >
        <Textarea
          id="orientacoes"
          name="orientacoes"
          maxLength={4000}
          placeholder="Manter repouso, oferecer água à vontade, retornar em caso de vômito…"
          defaultValue={receita?.orientacoes ?? ""}
        />
      </Campo>

      <Campo rotulo="Retorno em" htmlFor="retorno_em" dica="Opcional.">
        <Input
          id="retorno_em"
          name="retorno_em"
          type="date"
          min={DATA_MIN}
          max={DATA_MAX}
          className="sm:max-w-48"
          defaultValue={receita?.retorno_em ?? ""}
        />
      </Campo>

      <div className="flex gap-2 pt-2">
        <SubmitButton>
          <Check className="size-4" />
          {textoBotao}
        </SubmitButton>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
