"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";
import type { ComponentProps } from "react";

/** Botão de submit com estado de carregamento (useFormStatus). */
export function SubmitButton({
  children,
  carregando = "Salvando…",
  ...props
}: ComponentProps<typeof Button> & { carregando?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? carregando : children}
    </Button>
  );
}
