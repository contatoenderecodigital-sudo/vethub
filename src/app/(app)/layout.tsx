import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wordmark";
import { NavInferior, NavLateral } from "@/components/nav-links";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, usuario } = await getSessao();

  const { data: clinica } = await supabase
    .from("clinica")
    .select("nome")
    .eq("id", usuario.clinica_id)
    .single();

  async function sair() {
    "use server";
    const sb = await createClient();
    await sb.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Cabeçalho com o gradiente da marca */}
      <header className="bg-brand-gradient sticky top-0 z-40">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" aria-label="Ir para o início">
              <Wordmark sobre="escuro" className="text-xl" />
            </Link>
            {clinica && (
              <span className="hidden truncate rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white sm:inline">
                {clinica.nome}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/90 sm:inline">
              {usuario.nome}
            </span>
            <form action={sair}>
              <button
                type="submit"
                className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25 cursor-pointer"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Navegação lateral (desktop) */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 border-r border-edge bg-surface md:block">
          <NavLateral ehAdmin={usuario.papel === "admin"} />
        </aside>

        {/* Conteúdo */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Navegação inferior (mobile) */}
      <NavInferior />
    </div>
  );
}
