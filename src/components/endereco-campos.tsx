"use client";

import { useState } from "react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { Campo, Input, Select } from "@/components/ui/form";
import { mascaraCEP, soDigitos, UFS, type EnderecoValores } from "@/lib/validacao";

/**
 * Bloco de endereço completo (CEP → rua, número, complemento, bairro,
 * cidade, UF) para formulários react-hook-form. Ao completar o CEP,
 * busca no ViaCEP e preenche tudo sozinho — a pessoa só digita o número.
 *
 * Uso: dentro de um <FormProvider {...form}> cujo schema inclua
 * os campos de `camposEndereco` (lib/validacao.ts).
 */
export function EnderecoCampos<T extends FieldValues & EnderecoValores>() {
  const {
    register,
    setValue,
    setFocus,
    formState: { errors },
  } = useFormContext<T>();

  const [buscando, setBuscando] = useState(false);
  const [avisoCep, setAvisoCep] = useState<string | null>(null);

  const campo = (nome: keyof EnderecoValores) => nome as Path<T>;
  type ValorCampo = Parameters<typeof setValue>[1];
  const definir = (nome: keyof EnderecoValores, valor: string, validar = true) =>
    setValue(campo(nome), valor as ValorCampo, { shouldValidate: validar });

  async function aoMudarCep(valor: string) {
    const mascarado = mascaraCEP(valor);
    definir("cep", mascarado);
    setAvisoCep(null);

    const digitos = soDigitos(mascarado);
    if (digitos.length !== 8) return;

    // CEP completo → busca no ViaCEP e preenche o resto
    setBuscando(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      if (!res.ok) throw new Error();
      const dados = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (dados.erro) {
        setAvisoCep("CEP não encontrado — confira ou preencha manualmente.");
        return;
      }
      definir("logradouro", dados.logradouro ?? "");
      definir("bairro", dados.bairro ?? "");
      definir("cidade", dados.localidade ?? "");
      definir("uf", dados.uf ?? "");
      setFocus(campo("numero")); // só falta o número!
    } catch {
      setAvisoCep("Não foi possível buscar o CEP agora — preencha manualmente.");
    } finally {
      setBuscando(false);
    }
  }

  const erroDe = (nome: keyof EnderecoValores) =>
    (errors as Record<string, { message?: string } | undefined>)[nome]?.message;

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-ink">Endereço</legend>

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr_6rem]">
        <Campo
          rotulo="CEP"
          htmlFor="cep"
          erro={erroDe("cep")}
          dica={buscando ? undefined : "Preenche o resto sozinho"}
        >
          <div className="relative">
            <Input
              id="cep"
              inputMode="numeric"
              placeholder="00000-000"
              aria-invalid={!!erroDe("cep")}
              {...register(campo("cep"), {
                onChange: (e) => aoMudarCep(e.target.value),
              })}
            />
            {buscando && (
              <LoaderCircle className="absolute right-3 top-3 size-4 animate-spin text-brand-mint" />
            )}
          </div>
        </Campo>
        <Campo rotulo="Rua / Logradouro" htmlFor="logradouro" erro={erroDe("logradouro")}>
          <Input id="logradouro" {...register(campo("logradouro"))} />
        </Campo>
        <Campo rotulo="Número" htmlFor="numero" erro={erroDe("numero")}>
          <Input id="numero" placeholder="123" {...register(campo("numero"))} />
        </Campo>
      </div>

      {avisoCep && (
        <p className="rounded-lg bg-amber-300/25 px-3 py-2 text-xs font-medium text-amber-50">
          {avisoCep}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Complemento" htmlFor="complemento" erro={erroDe("complemento")}>
          <Input
            id="complemento"
            placeholder="Apto, bloco, casa…"
            {...register(campo("complemento"))}
          />
        </Campo>
        <Campo rotulo="Bairro" htmlFor="bairro" erro={erroDe("bairro")}>
          <Input id="bairro" {...register(campo("bairro"))} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Campo rotulo="Cidade" htmlFor="cidade" erro={erroDe("cidade")}>
          <Input id="cidade" {...register(campo("cidade"))} />
        </Campo>
        <Campo rotulo="UF" htmlFor="uf" erro={erroDe("uf")}>
          <Select id="uf" {...register(campo("uf"))}>
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
    </fieldset>
  );
}
