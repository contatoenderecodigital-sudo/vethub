"use client";

import { Button } from "./button";
import type { ComponentProps } from "react";

/** Botão de submit que pede confirmação antes de enviar o form pai. */
export function ConfirmButton({
  mensagem = "Tem certeza?",
  children,
  ...props
}: ComponentProps<typeof Button> & { mensagem?: string }) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
