import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

/**
 * Layout das páginas legais públicas (política de privacidade, termos de uso
 * e instruções de exclusão de dados). Acessível sem login — exigência da
 * Meta (App Review do WhatsApp) e da LGPD.
 */
export default function PublicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ano = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass-marca sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Página inicial do VetHub">
            <Wordmark sobre="escuro" className="text-2xl" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="glass rounded-2xl p-6 sm:p-10">{children}</div>
      </main>

      <footer className="border-t border-white/60">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {ano} VetHub. Todos os direitos reservados.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/termos-de-uso" className="hover:text-ink hover:underline">
              Termos de Uso
            </Link>
            <Link
              href="/politica-de-privacidade"
              className="hover:text-ink hover:underline"
            >
              Privacidade
            </Link>
            <Link
              href="/exclusao-de-dados"
              className="hover:text-ink hover:underline"
            >
              Exclusão de Dados
            </Link>
            <Link href="/login" className="hover:text-ink hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
