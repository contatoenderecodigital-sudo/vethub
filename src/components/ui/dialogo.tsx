"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Janela modal do VetHub, em vidro fosco.
 *
 * Usa Radix por baixo, que resolve o que costuma ficar mal feito à mão:
 * prende o foco dentro da janela, devolve o foco ao elemento de origem
 * ao fechar, fecha com Esc, trava a rolagem do fundo e anuncia título e
 * descrição para leitor de tela.
 */

export const Dialogo = Dialog.Root;
export const DialogoGatilho = Dialog.Trigger;
export const DialogoFechar = Dialog.Close;

export function DialogoConteudo({
  titulo,
  descricao,
  children,
  rodape,
  className,
}: {
  titulo: string;
  /** Some visualmente quando ausente, mas continua anunciado. */
  descricao?: string;
  children?: React.ReactNode;
  rodape?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fundo-modal fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          "glass-menu janela-modal fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md",
          "-translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl",
          "focus:outline-none",
          className
        )}
      >
        <Dialog.Title className="pr-8 text-base font-semibold text-white">
          {titulo}
        </Dialog.Title>

        {descricao ? (
          <Dialog.Description className="mt-1.5 text-sm text-white/85">
            {descricao}
          </Dialog.Description>
        ) : (
          // O Radix avisa no console quando falta descrição; esta fica oculta.
          <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
        )}

        {children && <div className="mt-4">{children}</div>}

        {rodape && (
          <div className="mt-5 flex flex-wrap justify-end gap-2">{rodape}</div>
        )}

        <Dialog.Close
          aria-label="Fechar"
          className="absolute right-3 top-3 flex size-8 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="size-4" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
