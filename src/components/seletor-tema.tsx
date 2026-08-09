"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";

/**
 * Troca a cor do sistema. A identidade da marca continua verde: isto é
 * a pele do app, escolha de cada clínica. A preferência fica no
 * localStorage e é aplicada no <html data-tema> antes da pintura
 * (script em layout.tsx), então não pisca ao recarregar.
 */

export const TEMAS = [
  { id: "esmeralda", nome: "Esmeralda", cor: "#059669", padrao: true },
  { id: "turquesa", nome: "Turquesa", cor: "#0d9488" },
  { id: "oceano", nome: "Oceano", cor: "#0284c7" },
  { id: "indigo", nome: "Índigo", cor: "#4f46e5" },
  { id: "violeta", nome: "Violeta", cor: "#7c3aed" },
  { id: "coral", nome: "Coral", cor: "#e11d48" },
  { id: "ambar", nome: "Âmbar", cor: "#ea580c" },
  { id: "grafite", nome: "Grafite", cor: "#475569" },
] as const;

export const CHAVE_TEMA = "vethub:tema";
export const CHAVE_MODO = "vethub:modo";

/**
 * Claro ou escuro. São coisas diferentes da cor: a cor é a identidade da
 * clínica, o modo é a luz da sala. Recepção com janela grande pede claro;
 * consultório com luz baixa pede escuro. Por isso os dois convivem no mesmo
 * menu, mas em linhas separadas.
 */
const MODOS = [
  { id: "escuro", nome: "Escuro", icone: Moon },
  { id: "claro", nome: "Claro", icone: Sun },
] as const;

export function SeletorTema() {
  const [aberto, setAberto] = useState(false);
  // Começa do que o script do layout já aplicou no <html>. Como o menu
  // nasce fechado, este valor não aparece no HTML inicial, sem risco de
  // divergência entre servidor e navegador.
  const [atual, setAtual] = useState<string>(() =>
    typeof document === "undefined"
      ? "esmeralda"
      : document.documentElement.dataset.tema || "esmeralda"
  );
  const [modo, setModo] = useState<string>(() =>
    typeof document === "undefined"
      ? "escuro"
      : document.documentElement.dataset.modo || "escuro"
  );
  const raiz = useRef<HTMLDivElement>(null);

  // A escolha manda no <html> e no armazenamento (efeito colateral externo)
  useEffect(() => {
    document.documentElement.dataset.tema = atual;
    try {
      localStorage.setItem(CHAVE_TEMA, atual);
    } catch {
      // navegador com armazenamento bloqueado: o tema vale só nesta aba
    }
  }, [atual]);

  useEffect(() => {
    document.documentElement.dataset.modo = modo;
    try {
      localStorage.setItem(CHAVE_MODO, modo);
    } catch {
      // navegador com armazenamento bloqueado: o modo vale só nesta aba
    }
  }, [modo]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function escolher(id: string) {
    setAtual(id);
    setAberto(false);
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Cor do sistema"
        title="Cor do sistema"
        className="flex size-11 cursor-pointer items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 lg:size-10"
      >
        <Palette className="size-4" strokeWidth={1.8} />
      </button>

      {aberto && (
        <div
          role="menu"
          className="glass-menu absolute right-0 z-50 mt-2 w-60 rounded-2xl p-3"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/90 drop-shadow-sm">
            Cor do sistema
          </p>
          <div className="grid grid-cols-4 gap-2">
            {TEMAS.map((tema) => (
              <button
                key={tema.id}
                type="button"
                role="menuitemradio"
                aria-checked={atual === tema.id}
                onClick={() => escolher(tema.id)}
                title={tema.nome}
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors hover:bg-white/15"
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full transition-all ${
                    atual === tema.id
                      ? "ring-2 ring-white ring-offset-2 ring-offset-transparent"
                      : "ring-1 ring-white/25"
                  }`}
                  style={{ backgroundColor: tema.cor }}
                >
                  {atual === tema.id && (
                    <Check className="size-4 text-white" strokeWidth={3} />
                  )}
                </span>
                <span
                  className={`text-[10px] leading-tight drop-shadow-sm ${
                    atual === tema.id ? "font-semibold text-white" : "text-white/80"
                  }`}
                >
                  {tema.nome}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-3 mb-2 border-t border-white/20 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/90 drop-shadow-sm">
            Claro ou escuro
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="menuitemradio"
                aria-checked={modo === m.id}
                onClick={() => {
                  setModo(m.id);
                  setAberto(false);
                }}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                  modo === m.id
                    ? "border-white/60 bg-white/25 text-white"
                    : "border-white/25 text-white/80 hover:bg-white/15 hover:text-white"
                }`}
              >
                <m.icone className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                {m.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
