import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { contarBalcao } from "@/lib/balcao";
import { ehDono } from "@/lib/dono";
import { liberadaComTesteVencido, situacaoDoTeste } from "@/lib/trial";
import { AvisoDoTeste } from "./aviso-teste";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wordmark";
import { NavInferior, NavLateral } from "@/components/nav-links";
import { SeletorTema } from "@/components/seletor-tema";
import { SeletorUnidade } from "@/components/seletor-unidade";
import { GuiaCapivara } from "@/components/guia/guia-capivara";

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
  const { supabase, usuario, unidade, unidades, conta } = await getSessao();

  // O número do balcão vem junto da clínica, na mesma espera: sem ele no
  // menu ninguém abre a tela, e uma fila que ninguém abre não é uma fila.
  // Onde a pessoa está agora: o teste vencido fecha só as telas de criar
  // registro, e para saber quais é preciso o endereço.
  const rota = (await headers()).get("x-pathname") ?? "";
  const teste = situacaoDoTeste(conta);
  if (teste.vencido && rota && !liberadaComTesteVencido(rota)) {
    redirect("/assinatura/expirou");
  }

  const [{ data: clinica }, balcao, dono] = await Promise.all([
    supabase.from("clinica").select("nome").eq("id", usuario.clinica_id).single(),
    contarBalcao(supabase),
    ehDono(usuario.email),
  ]);

  async function sair() {
    "use server";
    const sb = await createClient();
    await sb.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Cabeçalho: vidro transparente sobre o degradê da marca, o
          conteúdo passa desfocado por baixo ao rolar */}
      <header className="sticky top-0 z-40 border-b border-white/20 bg-white/10 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Ir para o início"
              className="flex min-h-11 items-center"
            >
              <Wordmark sobre="escuro" className="text-xl" />
            </Link>
            {clinica && (
              <span className="hidden truncate rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white sm:inline">
                {clinica.nome}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SeletorUnidade atual={unidade} unidades={unidades} />

            <span data-guia="tema" className="flex">
              <SeletorTema />
            </span>

            {/* Usuário (mobile: no desktop fica na lateral) */}
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
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 lg:size-10"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Navegação lateral (desktop): painel de vidro flutuante */}
        <aside data-guia="menu" className="glass sticky top-[4.25rem] ml-3 mt-3 hidden h-[calc(100dvh-4.5rem)] w-60 shrink-0 flex-col justify-between self-start overflow-y-auto rounded-2xl md:flex 2xl:w-64">
          <NavLateral
            ehAdmin={usuario.papel === "admin"}
            plano={conta.plano}
            pendencias={balcao.total}
            dono={dono}
          />

          {/* Bloco do usuário */}
          <div className="border-t border-white/20 p-3">
            <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
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
                  className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-white/15 hover:text-red-100"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Conteúdo: largura acompanha a tela (notebook, monitor grande, TV) */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-8 2xl:px-10">
          <div className="mx-auto max-w-5xl xl:max-w-6xl 2xl:max-w-[88rem]">
            <AvisoDoTeste situacao={teste} />
            {children}
          </div>
        </main>
      </div>

      {/* Navegação inferior (mobile) */}
      <NavInferior
        ehAdmin={usuario.papel === "admin"}
        plano={conta.plano}
        pendencias={balcao.total}
        dono={dono}
      />

      {/* O Bento: o "?" do canto que explica a página */}
      <GuiaCapivara />
    </div>
  );
}
