import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-edge bg-surface p-4 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitulo({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-base font-semibold text-ink mb-3 ${className}`}>
      {children}
    </h2>
  );
}
