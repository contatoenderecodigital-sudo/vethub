import { formatTelefone } from "@/lib/format";
import { soDigitos } from "@/lib/validacao";

/**
 * Telefone do tutor pronto para a ação comercial: na tela vira link do
 * WhatsApp, no papel imprime só o número formatado.
 */
export function TelefoneTutor({ telefone }: { telefone: string | null | undefined }) {
  const digitos = soDigitos(telefone);
  const formatado = formatTelefone(telefone);
  if (!digitos) return <>-</>;

  return (
    <a
      href={`https://wa.me/${digitos}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-6 items-center whitespace-nowrap font-medium text-ink underline decoration-white/40 underline-offset-2 hover:decoration-white print:no-underline"
    >
      {formatado}
    </a>
  );
}
