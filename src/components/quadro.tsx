"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as EventoTeclado,
  type PointerEvent as EventoPonteiro,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { GripHorizontal } from "lucide-react";

/**
 * Quadro arrastável (kanban): mouse, caneta E dedo.
 *
 * Por que não o drag and drop nativo do HTML5: ele não existe em tela de
 * toque. Celular e tablet, justamente onde o balcão trabalha, nunca
 * disparam dragstart, então o cartão simplesmente não sai do lugar. Aqui
 * tudo roda em Pointer Events, que valem para os três aparelhos.
 *
 * Peças:
 * - `<Quadro>`          guarda o arrasto e salva a mudança (server action);
 * - `<Zona>`            a coluna que recebe o cartão;
 * - `<CartaoArrastavel>` o cartão, com uma alça (⠿) no topo.
 *
 * O cartão que viaja com o ponteiro é um CLONE pendurado no <body>. As
 * colunas usam backdrop-filter, e isso prende `position: fixed` dentro
 * delas: o cartão original ficaria cortado na borda da coluna de origem.
 */

interface ContextoQuadro {
  /** Id do cartão que está sendo arrastado agora (null = ninguém). */
  arrastando: string | null;
  /** Id da zona sob o ponteiro. */
  zonaAlvo: string | null;
  /** Id do cartão cuja mudança está sendo gravada. */
  salvando: string | null;
  comecar: (
    evento: EventoPonteiro<HTMLElement>,
    id: string,
    elemento: HTMLElement
  ) => void;
  /** Teclado: joga o cartão para a coluna vizinha (1 = direita, -1 = esquerda). */
  mover: (id: string, elemento: HTMLElement, direcao: 1 | -1) => void;
}

const Contexto = createContext<ContextoQuadro | null>(null);

function useContextoQuadro(nome: string): ContextoQuadro {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error(`<${nome}> precisa estar dentro de <Quadro>.`);
  return contexto;
}

/** Estado vivo do arrasto: em ref, porque muda a cada pixel. */
interface Arrasto {
  id: string;
  origem: HTMLElement;
  clone: HTMLElement;
  ponteiro: number;
  /** Coordenada onde o dedo/ponteiro pegou o cartão. */
  inicioX: number;
  inicioY: number;
  /** Última posição conhecida do ponteiro. */
  x: number;
  y: number;
  zonaInicial: string | null;
  zona: string | null;
  /** Só vira true depois de andar alguns pixels. Evita "arrastar" no clique. */
  andou: boolean;
}

/** Distância em px a partir da qual o toque vira arrasto de verdade. */
const LIMIAR = 5;
/** Faixa da borda que liga a rolagem automática durante o arrasto. */
const MARGEM_ROLAGEM = 72;
const PASSO_ROLAGEM = 18;

export function Quadro({
  aoSoltar,
  children,
  className = "",
}: {
  /**
   * Chamada quando o cartão cai numa coluna diferente da de origem.
   * Devolva `{ erro }` para a mensagem aparecer no rodapé do quadro.
   */
  aoSoltar: (
    cartaoId: string,
    zonaId: string
  ) => Promise<{ erro?: string } | void>;
  children: ReactNode;
  className?: string;
}) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [zonaAlvo, setZonaAlvo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const raiz = useRef<HTMLDivElement>(null);
  const arrasto = useRef<Arrasto | null>(null);
  const animacao = useRef(0);
  /** Guarda os handlers globais para poder removê-los exatamente iguais. */
  const ouvintes = useRef<(() => void) | null>(null);

  // A mensagem de erro some sozinha. Ninguém quer fechar aviso no balcão.
  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(() => setErro(null), 6000);
    return () => clearTimeout(t);
  }, [erro]);

  // `aoSoltar` costuma vir como arrow function inline, ou seja, muda de
  // identidade a cada render. Guardá-la numa ref mantém `salvar`, `encerrar`
  // e `comecar` estáveis. Sem isso o próprio re-render do arrasto derrubaria
  // o arrasto no meio do caminho.
  const aoSoltarRef = useRef(aoSoltar);
  useEffect(() => {
    aoSoltarRef.current = aoSoltar;
  });

  const salvar = useCallback(
    async (id: string, zona: string) => {
      setSalvando(id);
      setErro(null);
      try {
        const resultado = (await aoSoltarRef.current(id, zona)) as
          | { erro?: string }
          | undefined;
        if (resultado?.erro) setErro(resultado.erro);
        else router.refresh();
      } catch {
        setErro("Não foi possível salvar a mudança. Tente de novo.");
      } finally {
        setSalvando(null);
      }
    },
    [router]
  );

  /** Descobre a coluna que está embaixo do ponteiro. */
  const zonaEm = useCallback((x: number, y: number): string | null => {
    const alvo = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-zona-solta]");
    return alvo?.dataset.zonaSolta ?? null;
  }, []);

  const encerrar = useCallback(
    (cancelado: boolean) => {
      const atual = arrasto.current;
      if (!atual) return;
      arrasto.current = null;

      cancelAnimationFrame(animacao.current);
      ouvintes.current?.();
      ouvintes.current = null;

      atual.clone.remove();
      atual.origem.style.opacity = "";
      try {
        atual.origem.releasePointerCapture(atual.ponteiro);
      } catch {
        // o ponteiro já pode ter sido liberado pelo navegador
      }
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      setArrastando(null);
      setZonaAlvo(null);

      // Depois de arrastar de verdade, o clique que vem junto não pode
      // abrir o link do cartão.
      if (atual.andou) {
        const engolir = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
        };
        document.addEventListener("click", engolir, {
          capture: true,
          once: true,
        });
        setTimeout(
          () => document.removeEventListener("click", engolir, true),
          400
        );
      }

      if (!cancelado && atual.andou && atual.zona && atual.zona !== atual.zonaInicial) {
        void salvar(atual.id, atual.zona);
      }
    },
    [salvar]
  );

  /**
   * Liga a rolagem automática: enquanto o cartão fica perto de uma borda, o
   * quadro anda sozinho (senão não dá para alcançar a coluna do fim numa
   * tela estreita).
   */
  const ligarRolagem = useCallback(() => {
    function passo() {
      const atual = arrasto.current;
      if (!atual) return;

      const trilho = raiz.current;
      if (trilho && trilho.scrollWidth > trilho.clientWidth + 1) {
        const caixa = trilho.getBoundingClientRect();
        if (atual.x < caixa.left + MARGEM_ROLAGEM) {
          trilho.scrollLeft -= PASSO_ROLAGEM;
        } else if (atual.x > caixa.right - MARGEM_ROLAGEM) {
          trilho.scrollLeft += PASSO_ROLAGEM;
        }
      }

      if (atual.y < MARGEM_ROLAGEM) window.scrollBy(0, -PASSO_ROLAGEM);
      else if (atual.y > window.innerHeight - MARGEM_ROLAGEM) {
        window.scrollBy(0, PASSO_ROLAGEM);
      }

      // A tela andou debaixo do ponteiro: a coluna sob ele pode ter mudado.
      const zona = zonaEm(atual.x, atual.y);
      if (zona !== atual.zona) {
        atual.zona = zona;
        setZonaAlvo(zona);
      }

      animacao.current = requestAnimationFrame(passo);
    }

    animacao.current = requestAnimationFrame(passo);
  }, [zonaEm]);

  const comecar = useCallback(
    (evento: EventoPonteiro<HTMLElement>, id: string, elemento: HTMLElement) => {
      // botão do meio/direito do mouse não arrasta
      if (arrasto.current || (evento.pointerType === "mouse" && evento.button !== 0)) {
        return;
      }

      const caixa = elemento.getBoundingClientRect();
      const clone = elemento.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      clone.style.cssText = [
        "position:fixed",
        `left:${caixa.left}px`,
        `top:${caixa.top}px`,
        `width:${caixa.width}px`,
        `height:${caixa.height}px`,
        "margin:0",
        "z-index:70",
        "pointer-events:none",
        "opacity:0.97",
        "transform:rotate(1.5deg) scale(1.03)",
        "box-shadow:0 20px 45px rgb(0 0 0 / 0.45)",
        "transition:none",
      ].join(";");
      document.body.appendChild(clone);

      elemento.style.opacity = "0.35";
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      const zonaInicial =
        elemento.closest<HTMLElement>("[data-zona-solta]")?.dataset.zonaSolta ??
        null;

      arrasto.current = {
        id,
        origem: elemento,
        clone,
        ponteiro: evento.pointerId,
        inicioX: evento.clientX,
        inicioY: evento.clientY,
        x: evento.clientX,
        y: evento.clientY,
        zonaInicial,
        zona: zonaInicial,
        andou: false,
      };

      try {
        elemento.setPointerCapture(evento.pointerId);
      } catch {
        // navegador sem captura: os ouvintes no window dão conta
      }

      function aoMover(e: PointerEvent) {
        const atual = arrasto.current;
        if (!atual || e.pointerId !== atual.ponteiro) return;
        e.preventDefault();

        atual.x = e.clientX;
        atual.y = e.clientY;

        const dx = e.clientX - atual.inicioX;
        const dy = e.clientY - atual.inicioY;
        if (!atual.andou && Math.hypot(dx, dy) < LIMIAR) return;
        atual.andou = true;

        atual.clone.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(1.5deg) scale(1.03)`;

        const zona = zonaEm(e.clientX, e.clientY);
        if (zona !== atual.zona) {
          atual.zona = zona;
          setZonaAlvo(zona);
        }
      }

      function aoLevantar(e: PointerEvent) {
        if (arrasto.current && e.pointerId !== arrasto.current.ponteiro) return;
        encerrar(false);
      }

      function aoCancelar() {
        encerrar(true);
      }

      function aoTeclar(e: KeyboardEvent) {
        if (e.key === "Escape") encerrar(true);
      }

      window.addEventListener("pointermove", aoMover, { passive: false });
      window.addEventListener("pointerup", aoLevantar);
      window.addEventListener("pointercancel", aoCancelar);
      window.addEventListener("keydown", aoTeclar);
      ouvintes.current = () => {
        window.removeEventListener("pointermove", aoMover);
        window.removeEventListener("pointerup", aoLevantar);
        window.removeEventListener("pointercancel", aoCancelar);
        window.removeEventListener("keydown", aoTeclar);
      };

      setArrastando(id);
      setZonaAlvo(zonaInicial);
      ligarRolagem();
    },
    [encerrar, ligarRolagem, zonaEm]
  );

  const mover = useCallback(
    (id: string, elemento: HTMLElement, direcao: 1 | -1) => {
      const zonas = Array.from(
        raiz.current?.querySelectorAll<HTMLElement>("[data-zona-solta]") ?? []
      );
      const atual = elemento.closest<HTMLElement>("[data-zona-solta]");
      const indice = atual ? zonas.indexOf(atual) : -1;
      const destino = indice >= 0 ? zonas[indice + direcao] : undefined;
      if (!destino?.dataset.zonaSolta) return;
      void salvar(id, destino.dataset.zonaSolta);
    },
    [salvar]
  );

  // Sair da página no meio do arrasto não pode deixar clone órfão no body.
  useEffect(() => () => encerrar(true), [encerrar]);

  return (
    <Contexto.Provider
      value={{ arrastando, zonaAlvo, salvando, comecar, mover }}
    >
      <div ref={raiz} className={className}>
        {children}
      </div>

      {erro && (
        <p
          role="alert"
          className="glass-menu fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl px-3 py-2 text-center text-sm font-medium text-white md:bottom-6"
        >
          {erro}
        </p>
      )}
    </Contexto.Provider>
  );
}

/** Coluna do quadro: recebe o cartão solto em cima dela. */
export function Zona({
  id,
  children,
  className = "",
  classeAlvo = "ring-2 ring-white/70",
  rotulo,
}: {
  /** Valor entregue ao `aoSoltar` do `<Quadro>` (o status, normalmente). */
  id: string;
  children: ReactNode;
  className?: string;
  /** Classe aplicada quando o cartão está pairando aqui. */
  classeAlvo?: string;
  rotulo?: string;
}) {
  const { arrastando, zonaAlvo } = useContextoQuadro("Zona");
  const emArrasto = arrastando !== null;
  const alvo = emArrasto && zonaAlvo === id;

  return (
    <section
      data-zona-solta={id}
      aria-label={rotulo}
      className={`${className} transition-shadow ${
        emArrasto ? "outline-1 outline-dashed outline-white/35" : ""
      } ${alvo ? classeAlvo : ""}`}
    >
      {children}
    </section>
  );
}

/**
 * Cartão que se arrasta entre as colunas.
 *
 * Mouse e caneta pegam o cartão de qualquer ponto; no dedo o arrasto sai só
 * pela alça do topo, assim rolar a lista com o dedo continua funcionando.
 * A alça também é um botão de teclado: ← e → jogam o cartão de coluna.
 */
export function CartaoArrastavel({
  id,
  rotulo,
  children,
  className = "",
}: {
  id: string;
  /** Nome do cartão, usado nos rótulos de acessibilidade. */
  rotulo: string;
  children: ReactNode;
  className?: string;
}) {
  const { arrastando, salvando, comecar, mover } =
    useContextoQuadro("CartaoArrastavel");
  const referencia = useRef<HTMLDivElement>(null);
  const emArrasto = arrastando === id;
  const emSalvamento = salvando === id;

  function pegarPeloCorpo(evento: EventoPonteiro<HTMLDivElement>) {
    // No toque, o corpo do cartão continua servindo para rolar e clicar.
    if (evento.pointerType === "touch") return;
    const alvo = evento.target as HTMLElement;
    if (alvo.closest("button, input, select, textarea, label, [data-nao-arrastar]")) {
      return;
    }
    if (referencia.current) comecar(evento, id, referencia.current);
  }

  function pegarPelaAlca(evento: EventoPonteiro<HTMLButtonElement>) {
    evento.preventDefault();
    if (referencia.current) comecar(evento, id, referencia.current);
  }

  function aoTeclarNaAlca(evento: EventoTeclado<HTMLButtonElement>) {
    const direcao =
      evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    if (!direcao || !referencia.current) return;
    evento.preventDefault();
    mover(id, referencia.current, direcao);
  }

  return (
    <div
      ref={referencia}
      data-cartao-id={id}
      draggable={false}
      // corta o arrasto nativo de links e fotos de dentro do cartão
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={pegarPeloCorpo}
      className={`relative select-none ${className} pt-6 ${
        emArrasto ? "opacity-35" : ""
      } ${emSalvamento ? "pointer-events-none opacity-60" : ""}`}
    >
      <button
        type="button"
        aria-label={`Mover ${rotulo} de coluna: arraste, ou use as setas esquerda e direita`}
        title="Arraste para mover de coluna"
        onPointerDown={pegarPelaAlca}
        onKeyDown={aoTeclarNaAlca}
        className="absolute inset-x-0 top-0 flex h-6 cursor-grab touch-none items-center justify-center rounded-t-xl text-white/45 transition-colors hover:bg-white/15 hover:text-white focus-visible:bg-white/15 focus-visible:text-white focus-visible:outline-2 focus-visible:outline-white active:cursor-grabbing"
      >
        <GripHorizontal className="size-4" strokeWidth={2} aria-hidden />
      </button>

      {children}
    </div>
  );
}
