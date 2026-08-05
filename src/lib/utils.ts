import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Junta classes do Tailwind resolvendo conflitos (a última vence).
 * Usado pelos componentes de UI para aceitar `className` sem brigar
 * com os estilos padrão.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
