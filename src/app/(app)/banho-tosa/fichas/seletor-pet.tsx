"use client";

import { useRouter } from "next/navigation";
import { BuscaCombobox } from "@/components/busca-combobox";

/**
 * Escolhe o pet e já abre a ficha de banho e tosa dele (criando na hora, se
 * ainda não existir). Usa a busca do servidor — nunca carrega todos os pets.
 */
export function SeletorPetFicha() {
  const router = useRouter();

  return (
    <BuscaCombobox
      name="pet_id"
      endpoint="/api/busca/pets"
      placeholder="Buscar o pet pelo nome…"
      aoSelecionar={(opcao) => {
        if (opcao) router.push(`/banho-tosa/fichas/${opcao.id}`);
      }}
    />
  );
}
