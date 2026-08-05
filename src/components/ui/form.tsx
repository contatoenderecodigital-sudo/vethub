import type { ComponentProps, ReactNode } from "react";

const CAMPO_BASE =
  "w-full rounded-lg border border-white/30 bg-white/15 px-3 text-sm text-white " +
  "backdrop-blur-sm [color-scheme:dark] placeholder:text-white/50 transition-colors " +
  "focus:border-white/60 focus:bg-white/20 focus:outline-2 focus:outline-white/40 " +
  "disabled:bg-white/10 disabled:text-white/50";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${CAMPO_BASE} h-10 ${className}`} {...props} />;
}

/**
 * A seta padrão do <select> é desenhada pelo sistema operacional e
 * destoa do vidro (aparece cinza e quadrada no Windows). Aqui ela é
 * substituída por um chevron branco desenhado no próprio fundo do
 * campo: o menu de opções continua sendo o nativo, que é o certo
 * para acessibilidade e para o teclado do celular.
 *
 * A URL do SVG vai entre ASPAS SIMPLES e os atributos de dentro usam %22.
 * Com aspas duplas o JavaScript escapa a barra invertida e o CSS gerado sai
 * como `url(\"data:…\")`, que o navegador descarta — a seta some.
 */
const SETA_SELECT =
  "appearance-none bg-no-repeat pr-9 " +
  "bg-[length:1.15rem_1.15rem] bg-[position:right_0.6rem_center] " +
  "bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]";

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`${CAMPO_BASE} ${SETA_SELECT} h-10 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${CAMPO_BASE} py-2 min-h-24 ${className}`} {...props} />;
}

interface CampoProps {
  rotulo: string;
  htmlFor?: string;
  obrigatorio?: boolean;
  dica?: string;
  erro?: string;
  children: ReactNode;
  className?: string;
}

/** Wrapper de campo: rótulo + controle + dica + mensagem de erro. */
export function Campo({
  rotulo,
  htmlFor,
  obrigatorio,
  dica,
  erro,
  children,
  className = "",
}: CampoProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* O asterisco vem colado na última palavra por um espaço inquebrável:
          em coluna estreita ele acompanha o rótulo em vez de cair sozinho
          numa linha nova. */}
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {rotulo}
        {obrigatorio && <span className="text-red-100">&nbsp;*</span>}
      </label>
      {children}
      {erro ? (
        <p className="text-xs font-medium text-red-100" role="alert">
          {erro}
        </p>
      ) : (
        dica && <p className="text-xs text-ink-muted">{dica}</p>
      )}
    </div>
  );
}
