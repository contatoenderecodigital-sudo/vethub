"use client";

import { useState } from "react";
import {
  CATEGORIA_DO_TIPO,
  TIPOS_CONTA,
  type CategoriaFinanceira,
  type ContaTipo,
} from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { SubmitButton } from "@/components/ui/submit-button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { mascaraMoeda } from "./schema";

/** 1 a 24 meses de repetição. */
const MESES = Array.from({ length: 24 }, (_, i) => i + 1);

export interface ContaValoresIniciais {
  tipo: ContaTipo;
  descricao: string;
  categoria_id: string;
  valor: string;
  vencimento: string;
  fornecedor: string;
  observacao: string;
}

/**
 * Formulário de conta (nova/editar). O tipo controla a tela: conta a receber
 * pede tutor e categorias de receita; conta a pagar pede fornecedor e
 * categorias de despesa. O servidor revalida tudo com zod.
 */
export function ContaForm({
  action,
  categorias,
  valoresIniciais,
  tutorInicial,
  cancelarHref,
  permitirRepetir = false,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  categorias: Pick<CategoriaFinanceira, "id" | "nome" | "tipo">[];
  valoresIniciais: ContaValoresIniciais;
  tutorInicial?: OpcaoBusca;
  cancelarHref: string;
  permitirRepetir?: boolean;
  erro?: string;
}) {
  const [tipo, setTipo] = useState<ContaTipo>(valoresIniciais.tipo);
  const [valor, setValor] = useState(valoresIniciais.valor);
  const [repetir, setRepetir] = useState(false);

  // A lista de categorias acompanha o tipo escolhido, sem ida ao servidor.
  const categoriasDoTipo = categorias.filter(
    (c) => c.tipo === CATEGORIA_DO_TIPO[tipo]
  );
  const categoriaValida = categoriasDoTipo.some(
    (c) => c.id === valoresIniciais.categoria_id
  );

  return (
    <form action={action} className="space-y-4">
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tipo da conta" htmlFor="conta-tipo" obrigatorio>
          <Select
            id="conta-tipo"
            name="tipo"
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ContaTipo)}
          >
            {TIPOS_CONTA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo
          rotulo="Categoria"
          htmlFor="conta-categoria"
          dica={
            categoriasDoTipo.length === 0
              ? "Nenhuma categoria cadastrada para este tipo."
              : undefined
          }
        >
          {/* key força o select a voltar para o vazio quando o tipo muda */}
          <Select
            key={tipo}
            id="conta-categoria"
            name="categoria_id"
            defaultValue={categoriaValida ? valoresIniciais.categoria_id : ""}
          >
            <option value="">Sem categoria</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <Campo rotulo="Descrição" htmlFor="conta-descricao" obrigatorio>
        <Input
          id="conta-descricao"
          name="descricao"
          required
          maxLength={200}
          defaultValue={valoresIniciais.descricao}
          placeholder={
            tipo === "receber"
              ? "Ex.: Cirurgia da Mel — parcela do tutor"
              : "Ex.: Aluguel da clínica"
          }
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Valor (R$)" htmlFor="conta-valor" obrigatorio>
          <Input
            id="conta-valor"
            name="valor"
            inputMode="decimal"
            placeholder="0,00"
            required
            autoComplete="off"
            value={valor}
            onChange={(e) => setValor(mascaraMoeda(e.target.value))}
          />
        </Campo>

        <Campo rotulo="Vencimento" htmlFor="conta-vencimento" obrigatorio>
          <CampoData
            id="conta-vencimento"
            name="vencimento"
            required
            min="2015-01-01"
            defaultValue={valoresIniciais.vencimento}
          />
        </Campo>
      </div>

      {tipo === "receber" ? (
        <Campo
          rotulo="Tutor"
          htmlFor="conta-tutor"
          dica="Quem deve este valor para a clínica (opcional)."
        >
          <BuscaCombobox
            id="conta-tutor"
            name="tutor_id"
            endpoint="/api/busca/tutores"
            placeholder="Busque o tutor por nome, telefone ou CPF…"
            valorInicial={tutorInicial}
          />
        </Campo>
      ) : (
        <Campo rotulo="Fornecedor" htmlFor="conta-fornecedor">
          <Input
            id="conta-fornecedor"
            name="fornecedor"
            maxLength={120}
            defaultValue={valoresIniciais.fornecedor}
            placeholder="Ex.: Distribuidora Vet Norte"
          />
        </Campo>
      )}

      <Campo rotulo="Observação" htmlFor="conta-observacao">
        <Textarea
          id="conta-observacao"
          name="observacao"
          maxLength={500}
          defaultValue={valoresIniciais.observacao}
          placeholder="Número da nota, combinação com o tutor, condições…"
        />
      </Campo>

      {permitirRepetir && (
        <div className="rounded-xl border border-edge bg-white/10 p-3">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="repetir"
              className="mt-0.5 size-4 accent-[#34D399]"
              checked={repetir}
              onChange={(e) => setRepetir(e.target.checked)}
            />
            <span>
              Repetir esta conta todo mês
              <span className="block text-xs text-ink-muted">
                Gera uma conta por mês a partir do vencimento informado. O último
                dia do mês é respeitado: 31/01 vira 28/02.
              </span>
            </span>
          </label>

          {repetir && (
            <div className="mt-3 max-w-48">
              <Campo rotulo="Quantidade de meses" htmlFor="conta-meses">
                <Select id="conta-meses" name="meses" defaultValue="12">
                  {MESES.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? "mês" : "meses"}
                    </option>
                  ))}
                </Select>
              </Campo>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <SubmitButton>Salvar</SubmitButton>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
