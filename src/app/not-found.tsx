import Link from "next/link";
import { SearchX } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Página não encontrada" };

/**
 * 404 do sistema inteiro (a página padrão do Next vem em inglês).
 * Não usa o layout do app porque também atende quem está deslogado.
 */
export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <Wordmark sobre="escuro" className="mb-8 text-3xl" />

      <div className="glass-forte w-full max-w-md rounded-3xl p-8">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white/20 text-white">
          <SearchX className="size-7" strokeWidth={1.8} />
        </span>
        <h1 className="text-xl font-bold text-ink">Página não encontrada</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          O endereço não existe, o registro foi removido ou ele pertence a
          outra clínica.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-lg bg-white px-4 lg:h-10 text-sm font-semibold text-brand-dark shadow-lg shadow-black/10 transition-colors hover:bg-white/90"
          >
            Ir para o início
          </Link>
          <Link
            href="/agenda"
            className="inline-flex h-11 items-center rounded-lg border border-white/40 lg:h-10 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            Abrir a agenda
          </Link>
        </div>
      </div>
    </main>
  );
}
