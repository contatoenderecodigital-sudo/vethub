"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/form";
import { mascaraMoeda } from "./numeros";

/**
 * Input de dinheiro com máscara pt-BR (digita da direita para a esquerda).
 * O servidor revalida o número com zod — a máscara é só conforto de balcão.
 */
export function CampoMoeda({
  valorInicial = "",
  ...props
}: ComponentProps<"input"> & { valorInicial?: string }) {
  const [valor, setValor] = useState(valorInicial);

  return (
    <Input
      inputMode="decimal"
      placeholder="0,00"
      autoComplete="off"
      {...props}
      value={valor}
      onChange={(e) => setValor(mascaraMoeda(e.target.value))}
    />
  );
}
