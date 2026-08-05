"use client";

import { useRef, useState, type ComponentProps } from "react";
import { Button } from "./button";
import { Dialogo, DialogoConteudo } from "./dialogo";

/**
 * Botão que pede confirmação antes de enviar o form pai.
 *
 * A janela é a do sistema (vidro), não o `window.confirm` do navegador —
 * que aparece no topo da tela, ignora o tema e assusta o usuário.
 *
 * Detalhe de implementação: o botão visível só abre a janela. Quem envia
 * de fato é um botão de submit escondido, que carrega o mesmo
 * `formAction` — assim continua funcionando em formulários com mais de
 * uma ação (as listas de marcas, unidades e categorias usam isso).
 */
export function ConfirmButton({
  mensagem = "Tem certeza?",
  titulo = "Confirmar",
  rotuloConfirmar = "Confirmar",
  formAction,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  mensagem?: string;
  titulo?: string;
  rotuloConfirmar?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  const perigoso = props.variante === "danger";

  return (
    <>
      <Button type="button" onClick={() => setAberto(true)} {...props}>
        {children}
      </Button>

      {/* Envia o formulário de verdade; nunca aparece na tela nem no Tab. */}
      <button
        ref={submitRef}
        type="submit"
        formAction={formAction}
        tabIndex={-1}
        aria-hidden
        className="hidden"
      />

      <Dialogo open={aberto} onOpenChange={setAberto}>
        <DialogoConteudo
          titulo={titulo}
          descricao={mensagem}
          rodape={
            <>
              <Button
                type="button"
                variante="secondary"
                onClick={() => setAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variante={perigoso ? "danger" : "primary"}
                onClick={() => {
                  setAberto(false);
                  submitRef.current?.click();
                }}
              >
                {rotuloConfirmar}
              </Button>
            </>
          }
        />
      </Dialogo>
    </>
  );
}
