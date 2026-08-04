import type { ComponentProps, ReactNode } from "react";

const CAMPO_BASE =
  "w-full rounded-lg border border-edge bg-surface px-3 text-sm text-ink " +
  "placeholder:text-zinc-400 focus:border-brand focus:outline-2 " +
  "focus:outline-brand/30 disabled:bg-zinc-50 disabled:text-ink-muted";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${CAMPO_BASE} h-10 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${CAMPO_BASE} h-10 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${CAMPO_BASE} py-2 min-h-24 ${className}`} {...props} />;
}

interface CampoProps {
  rotulo: string;
  htmlFor?: string;
  obrigatorio?: boolean;
  dica?: string;
  children: ReactNode;
  className?: string;
}

/** Wrapper de campo: rótulo + controle + dica. */
export function Campo({
  rotulo,
  htmlFor,
  obrigatorio,
  dica,
  children,
  className = "",
}: CampoProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {rotulo}
        {obrigatorio && <span className="text-danger"> *</span>}
      </label>
      {children}
      {dica && <p className="text-xs text-ink-muted">{dica}</p>}
    </div>
  );
}
