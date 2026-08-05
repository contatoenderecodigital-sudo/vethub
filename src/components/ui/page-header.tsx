import type { ReactNode } from "react";

/**
 * Cabeçalho de página — vive DIRETO sobre o degradê da marca,
 * por isso o texto é branco (com sombra sutil para leitura).
 *
 * Layout à prova de aperto:
 * - no celular o título ocupa a linha inteira e as ações caem embaixo,
 *   alinhadas à esquerda, sem espremer nada;
 * - do `sm:` para cima volta a ser título à esquerda / ações à direita;
 * - as ações sempre quebram linha (`flex-wrap`) em vez de escapar do
 *   container, e ganham 44px de altura mínima no toque.
 *
 * Quando a página tem 3+ botões, passe o botão principal em
 * `acaoPrincipal` e o resto dentro de um `<MenuAcoes>` em `acao`.
 */
export function PageHeader({
  titulo,
  subtitulo,
  acao,
  acaoPrincipal,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
  /** Ação de destaque: fica sempre visível, à direita das demais. */
  acaoPrincipal?: ReactNode;
}) {
  const temAcoes = !!acao || !!acaoPrincipal;

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0 sm:flex-1">
        <h1 className="truncate text-xl font-bold text-white drop-shadow-sm sm:text-2xl">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="mt-0.5 text-sm text-white/85 drop-shadow-sm">{subtitulo}</p>
        )}
      </div>
      {temAcoes && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end [&>a]:min-h-11 [&>button]:min-h-11 [&>form>a]:min-h-11 [&>form>button]:min-h-11 sm:[&>a]:min-h-10 sm:[&>button]:min-h-10 sm:[&>form>a]:min-h-10 sm:[&>form>button]:min-h-10">
          {acao}
          {acaoPrincipal}
        </div>
      )}
    </div>
  );
}
