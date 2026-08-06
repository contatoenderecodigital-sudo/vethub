"use client";

import { useRef } from "react";
import { TriangleAlert } from "lucide-react";
import type { FieldErrors, FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Feedback de formulário: nunca deixar o usuário no escuro.
 *
 * O padrão anterior era travar o botão Salvar enquanto o formulário fosse
 * inválido. Parecia seguro, mas era a maior fonte de desistência: a pessoa
 * preenchia, clicava no botão apagado e NADA acontecia. Sem mensagem, sem
 * rolagem, sem pista. Todo mundo achava que o sistema tinha travado — e num
 * formulário de 12 campos ninguém adivinha qual é o que falta.
 *
 * Agora o botão fica sempre clicável. Ao clicar com erro:
 *   1. aparece um resumo no topo dizendo quantos campos faltam e quais;
 *   2. a tela rola até o primeiro campo com problema e o foca;
 *   3. cada campo continua mostrando o próprio erro embaixo.
 *
 * Isso é o padrão de acessibilidade para formulário longo, e é o que faz o
 * usuário resolver sozinho em vez de ligar para o suporte.
 */

/** Rótulos legíveis por nome de campo, para o resumo não falar em código. */
const ROTULOS: Record<string, string> = {
  nome: "Nome",
  telefone: "Telefone",
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  senha: "Senha",
  papel: "Perfil",
  cep: "CEP",
  logradouro: "Endereço",
  numero: "Número",
  bairro: "Bairro",
  cidade: "Cidade",
  uf: "Estado",
  especie: "Espécie",
  raca: "Raça",
  sexo: "Sexo",
  porte: "Porte",
  peso: "Peso",
  nascimento: "Nascimento",
  tutor_id: "Tutor",
  pet_id: "Pet",
  veterinario_id: "Profissional",
  data: "Data",
  hora: "Hora",
  tipo: "Tipo",
  valor: "Valor",
  preco_venda: "Preço de venda",
  preco_custo: "Preço de custo",
  descricao: "Descrição",
  observacoes: "Observações",
  motivo: "Motivo",
  box: "Box",
  queixa: "Queixa",
  vencimento: "Vencimento",
  quantidade: "Quantidade",
  unidade_id: "Unidade",
  grupo_id: "Grupo",
  consentimento_lgpd: "Consentimento LGPD",
};

const rotuloDe = (campo: string) =>
  ROTULOS[campo] ?? campo.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Nomes dos campos com erro, na ordem em que o formulário os declara. */
function camposComErro(erros: FieldErrors): string[] {
  return Object.keys(erros).filter((c) => erros[c]);
}

/**
 * Envolve o `handleSubmit` do react-hook-form para tratar o caminho do erro.
 *
 * Use assim, no lugar de `handleSubmit(aoEnviar)`:
 *   const { enviar, aviso } = useEnvioComAviso(form, aoEnviar);
 *   <form onSubmit={enviar}>{aviso}...</form>
 */
export function useEnvioComAviso<T extends FieldValues>(
  form: UseFormReturn<T>,
  aoEnviar: (valores: T) => void | Promise<void>
) {
  const topo = useRef<HTMLDivElement>(null);
  const { handleSubmit, setFocus, formState } = form;
  const erros = camposComErro(formState.errors);
  const tentou = formState.isSubmitted;

  function aoErrar(problemas: FieldErrors<T>) {
    const primeiro = camposComErro(problemas)[0];
    if (!primeiro) return;
    // Focar já rola a página até o campo na maioria dos navegadores; o
    // scrollIntoView cobre os que não rolam (e o campo dentro de um card
    // com rolagem própria).
    try {
      setFocus(primeiro as never, { shouldSelect: true });
    } catch {
      // campo sem registro focável (checkbox de grupo, editor custom)
    }
    document
      .querySelector(`[name="${primeiro}"], #${CSS.escape(primeiro)}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const aviso =
    tentou && erros.length > 0 ? (
      <div
        ref={topo}
        role="alert"
        aria-live="assertive"
        className="flex items-start gap-2 rounded-lg border border-red-300/50 bg-red-400/25 px-3 py-2.5 text-sm text-red-50"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">
            {erros.length === 1
              ? "Falta preencher 1 campo:"
              : `Faltam ${erros.length} campos:`}{" "}
            <span className="font-normal">
              {erros.map(rotuloDe).join(", ")}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-red-100/90">
            Os campos com problema estão marcados abaixo.
          </p>
        </div>
      </div>
    ) : null;

  return { enviar: handleSubmit(aoEnviar, aoErrar), aviso };
}
