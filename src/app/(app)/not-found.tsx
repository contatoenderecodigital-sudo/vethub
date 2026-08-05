import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata = { title: "Página não encontrada" };

/**
 * 404 de dentro do sistema (registro que não existe ou é de outra clínica).
 * Renderiza no layout do app, então mantém menu e cabeçalho no lugar — por
 * isso não repete o Wordmark, que já aparece no topo.
 */
export default function NaoEncontradoApp() {
  return (
    <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white/20 text-white">
        <SearchX className="size-7" strokeWidth={1.8} />
      </span>
      <h1 className="text-xl font-bold text-ink">Página não encontrada</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        O endereço não existe, o registro foi removido ou ele pertence a outra
        clínica.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-brand-dark shadow-lg shadow-black/10 transition-colors hover:bg-white/90"
        >
          Ir para o início
        </Link>
        <Link
          href="/agenda"
          className="inline-flex h-10 items-center rounded-lg border border-white/40 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
        >
          Abrir a agenda
        </Link>
      </div>
    </div>
  );
}
