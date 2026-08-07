"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Store } from "lucide-react";
import type { UnidadeSessao } from "@/lib/auth";
import { escolherUnidade } from "@/app/(app)/configuracoes/unidades/escolher";

/**
 * Em qual filial a pessoa está trabalhando agora.
 *
 * Só aparece para quem alcança mais de uma unidade — clínica com uma unidade
 * só (que é a maioria) não ganha um seletor inútil no cabeçalho, e quem está
 * preso a uma filial não tem o que escolher.
 *
 * A escolha vai para um cookie no servidor, e não para o localStorage: as
 * telas são renderizadas no servidor e precisam saber a unidade ANTES de
 * consultar o banco.
 */
export function SeletorUnidade({
  atual,
  unidades,
}: {
  atual: UnidadeSessao | null;
  unidades: UnidadeSessao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [trocando, iniciar] = useTransition();
  const router = useRouter();

  if (!atual || unidades.length < 2) return null;

  function trocar(id: string) {
    setAberto(false);
    iniciar(async () => {
      await escolherUnidade(id);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        disabled={trocando}
        title="Unidade em que você está trabalhando"
        className="flex h-8 max-w-40 cursor-pointer items-center gap-1.5 rounded-lg bg-white/15 px-2.5 text-xs font-medium text-white transition-colors hover:bg-white/25 disabled:opacity-60"
      >
        <Store className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
        <span className="min-w-0 truncate">{atual.nome}</span>
        <ChevronDown className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      </button>

      {aberto && (
        <>
          {/* Toque/clique fora fecha, sem precisar de listener global. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            aria-label="Escolher unidade"
            className="glass-menu absolute right-0 z-50 mt-2 w-56 rounded-2xl p-2"
          >
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-white/70 uppercase">
              Trabalhando em
            </p>
            {unidades.map((u) => (
              <button
                key={u.id}
                type="button"
                role="menuitemradio"
                aria-checked={u.id === atual.id}
                onClick={() => trocar(u.id)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                  u.id === atual.id
                    ? "bg-white/25 font-semibold text-white"
                    : "text-ink-muted hover:bg-white/15 hover:text-ink"
                }`}
              >
                <Store className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{u.nome}</span>
                {u.id === atual.id && <Check className="size-4 shrink-0" strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
