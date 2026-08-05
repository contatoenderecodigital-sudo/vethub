"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface OpcaoBusca {
  id: string;
  rotulo: string;
  detalhe?: string;
}

/**
 * Combobox com busca no servidor (paginada/limitada, nunca carrega tudo).
 * Guarda o id selecionado num input hidden para o form.
 *
 * Acessibilidade: segue o padrão ARIA de combobox com lista de sugestões.
 * O input anuncia estado e opção em foco, a lista é um listbox de verdade e
 * o teclado navega com ↑/↓, escolhe com Enter e fecha com Esc.
 */
export function BuscaCombobox({
  id,
  name,
  rotulo,
  endpoint,
  placeholder = "Digite para buscar…",
  valorInicial,
  obrigatorio = false,
  aoSelecionar,
}: {
  /** Id do input. Use o mesmo do `htmlFor` do Campo que envolve o combobox. */
  id?: string;
  name: string;
  /** Nome do campo para leitores de tela quando não houver label externo. */
  rotulo?: string;
  endpoint: string;
  placeholder?: string;
  valorInicial?: OpcaoBusca;
  obrigatorio?: boolean;
  /** Notifica formulários controlados (react-hook-form) sobre a seleção. */
  aoSelecionar?: (opcao: OpcaoBusca | null) => void;
}) {
  const idAuto = useId();
  const idInput = id ?? `busca-${idAuto}`;
  const idLista = `${idInput}-lista`;
  const idOpcao = (indice: number) => `${idInput}-opcao-${indice}`;

  const [texto, setTexto] = useState(valorInicial?.rotulo ?? "");
  const [selecionado, setSelecionado] = useState<OpcaoBusca | null>(
    valorInicial ?? null
  );
  const [opcoes, setOpcoes] = useState<OpcaoBusca[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  /** Índice da opção em destaque pelo teclado; -1 = nenhuma. */
  const [destacado, setDestacado] = useState(-1);
  const raiz = useRef<HTMLDivElement>(null);

  // busca com debounce (todo setState acontece dentro do timeout, nunca
  // sincronamente no corpo do effect)
  useEffect(() => {
    if (selecionado && texto === selecionado.rotulo) return;
    const t = setTimeout(async () => {
      const termo = texto.trim();
      if (!termo) {
        setOpcoes([]);
        setDestacado(-1);
        return;
      }
      setBuscando(true);
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(termo)}`);
        if (res.ok) {
          setOpcoes(await res.json());
          setDestacado(-1);
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
        setDestacado(-1);
      }
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  function escolher(opcao: OpcaoBusca) {
    setSelecionado(opcao);
    setTexto(opcao.rotulo);
    setAberto(false);
    setDestacado(-1);
    aoSelecionar?.(opcao);
  }

  const listaVisivel = aberto && opcoes.length > 0;

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setAberto(false);
      setDestacado(-1);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (opcoes.length === 0) return;
      e.preventDefault(); // não mexer o cursor dentro do texto
      if (!aberto) {
        setAberto(true);
        setDestacado(e.key === "ArrowDown" ? 0 : opcoes.length - 1);
        return;
      }
      const passo = e.key === "ArrowDown" ? 1 : -1;
      // -1 (nada em destaque) + passo já cai na primeira/última opção
      const proximo = (destacado + passo + opcoes.length + 1) % (opcoes.length + 1);
      setDestacado(proximo === opcoes.length ? -1 : proximo);
      return;
    }
    if (e.key === "Enter" && listaVisivel && destacado >= 0) {
      e.preventDefault(); // Enter escolhe a opção, não envia o formulário
      escolher(opcoes[destacado]);
    }
  }

  return (
    <div ref={raiz} className="relative">
      <input type="hidden" name={name} value={selecionado?.id ?? ""} />
      <input
        id={idInput}
        type="text"
        role="combobox"
        aria-label={rotulo}
        aria-expanded={listaVisivel}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={
          listaVisivel && destacado >= 0 ? idOpcao(destacado) : undefined
        }
        value={texto}
        required={obrigatorio && !selecionado}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setTexto(e.target.value);
          if (selecionado) aoSelecionar?.(null);
          setSelecionado(null);
          setDestacado(-1);
        }}
        onFocus={() => opcoes.length > 0 && setAberto(true)}
        onKeyDown={aoTeclar}
        className="h-10 w-full rounded-lg border border-white/30 bg-white/15 px-3 text-sm text-white backdrop-blur-sm placeholder:text-white/50 transition-colors focus:border-white/60 focus:bg-white/20 focus:outline-2 focus:outline-white/40"
      />
      {buscando && (
        <span className="absolute right-3 top-2.5 text-xs text-ink-muted">…</span>
      )}
      <ul
        id={idLista}
        role="listbox"
        aria-label={rotulo ? `Sugestões de ${rotulo.toLowerCase()}` : "Sugestões"}
        hidden={!listaVisivel}
        className="glass-menu absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl py-1"
      >
        {opcoes.map((o, indice) => (
          <li
            key={o.id}
            id={idOpcao(indice)}
            role="option"
            aria-selected={indice === destacado}
            onMouseDown={(e) => e.preventDefault()} // não tirar o foco do input
            onMouseEnter={() => setDestacado(indice)}
            onClick={() => escolher(o)}
            className={`flex min-h-11 cursor-pointer flex-col items-start justify-center px-3 py-2 text-left text-sm ${
              indice === destacado ? "bg-white/20" : "hover:bg-white/15"
            }`}
          >
            <span className="w-full truncate font-medium text-ink">{o.rotulo}</span>
            {o.detalhe && (
              <span className="w-full truncate text-xs text-ink-muted">{o.detalhe}</span>
            )}
          </li>
        ))}
      </ul>
      {aberto && !buscando && opcoes.length === 0 && texto.trim() && !selecionado && (
        <div
          role="status"
          className="glass-menu absolute z-30 mt-1 w-full rounded-xl px-3 py-2 text-sm text-white/70"
        >
          Nada encontrado.
        </div>
      )}
    </div>
  );
}
