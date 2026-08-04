"use client";

import { useEffect, useRef, useState } from "react";

export interface OpcaoBusca {
  id: string;
  rotulo: string;
  detalhe?: string;
}

/**
 * Combobox com busca no servidor (paginada/limitada — nunca carrega tudo).
 * Guarda o id selecionado num input hidden para o form.
 */
export function BuscaCombobox({
  name,
  endpoint,
  placeholder = "Digite para buscar…",
  valorInicial,
  obrigatorio = false,
  aoSelecionar,
}: {
  name: string;
  endpoint: string;
  placeholder?: string;
  valorInicial?: OpcaoBusca;
  obrigatorio?: boolean;
  /** Notifica formulários controlados (react-hook-form) sobre a seleção. */
  aoSelecionar?: (opcao: OpcaoBusca | null) => void;
}) {
  const [texto, setTexto] = useState(valorInicial?.rotulo ?? "");
  const [selecionado, setSelecionado] = useState<OpcaoBusca | null>(
    valorInicial ?? null
  );
  const [opcoes, setOpcoes] = useState<OpcaoBusca[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  // busca com debounce (todo setState acontece dentro do timeout, nunca
  // sincronamente no corpo do effect)
  useEffect(() => {
    if (selecionado && texto === selecionado.rotulo) return;
    const t = setTimeout(async () => {
      const termo = texto.trim();
      if (!termo) {
        setOpcoes([]);
        return;
      }
      setBuscando(true);
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(termo)}`);
        if (res.ok) {
          setOpcoes(await res.json());
          setAberto(true);
        }
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [texto, endpoint, selecionado]);

  // fecha ao clicar fora
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  return (
    <div ref={raiz} className="relative">
      <input type="hidden" name={name} value={selecionado?.id ?? ""} />
      <input
        type="text"
        value={texto}
        required={obrigatorio && !selecionado}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setTexto(e.target.value);
          if (selecionado) aoSelecionar?.(null);
          setSelecionado(null);
        }}
        onFocus={() => opcoes.length > 0 && setAberto(true)}
        className="h-10 w-full rounded-lg border border-white/30 bg-white/15 px-3 text-sm text-white backdrop-blur-sm placeholder:text-white/50 transition-colors focus:border-white/60 focus:bg-white/20 focus:outline-2 focus:outline-white/40"
      />
      {buscando && (
        <span className="absolute right-3 top-2.5 text-xs text-ink-muted">…</span>
      )}
      {aberto && opcoes.length > 0 && (
        <ul className="glass-forte absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl py-1">
          {opcoes.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  setSelecionado(o);
                  setTexto(o.rotulo);
                  setAberto(false);
                  aoSelecionar?.(o);
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-white/15"
              >
                <span className="font-medium text-ink">{o.rotulo}</span>
                {o.detalhe && (
                  <span className="text-xs text-ink-muted">{o.detalhe}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {aberto && !buscando && opcoes.length === 0 && texto.trim() && !selecionado && (
        <div className="glass-forte absolute z-20 mt-1 w-full rounded-xl px-3 py-2 text-sm text-ink-muted">
          Nada encontrado.
        </div>
      )}
    </div>
  );
}
