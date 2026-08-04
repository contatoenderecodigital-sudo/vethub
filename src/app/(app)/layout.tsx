import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wordmark";
import { NavInferior, NavLateral } from "@/components/nav-links";

const ROTULO_PAPEL: Record<string, string> = {
  admin: "Administrador",
  veterinario: "Veterinário",
  recepcao: "Recepção",
};

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

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
      <header className="bg-brand-gradient sticky top-0 z-40 shadow-sm">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
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
            {/* Usuário (mobile — no desktop fica na lateral) */}
            <span
              className="flex size-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white md:hidden"
              title={usuario.nome}
            >
              {iniciais(usuario.nome)}
            </span>
            <form action={sair} className="md:hidden">
              <button
                type="submit"
                aria-label="Sair"
                title="Sair"
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Navegação lateral (desktop) */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col justify-between overflow-y-auto border-r border-edge bg-surface md:flex">
          <NavLateral ehAdmin={usuario.papel === "admin"} />

          {/* Bloco do usuário */}
          <div className="border-t border-edge p-3">
            <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand-dark">
                {iniciais(usuario.nome)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {usuario.nome}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {ROTULO_PAPEL[usuario.papel]}
                </p>
              </div>
              <form action={sair}>
                <button
                  type="submit"
                  aria-label="Sair"
                  title="Sair"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-zinc-100 hover:text-danger"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </div>
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
