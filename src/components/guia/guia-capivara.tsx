"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  PawPrint,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { roteiroDaRota, type Passo, type Pose } from "./passos";

/**
 * O Bento: a capivara que explica o sistema.
 *
 * Botão "?" fixo no canto de toda página. Ao abrir, a tela escurece, o
 * pedaço explicado fica aceso (o "holofote") e a capivara aparece no canto
 * com um balão de fala. Passo a passo, no estilo dos aplicativos que ensinam
 * na primeira vez.
 *
 * O holofote é um retângulo com uma sombra gigante ao redor
 * (`box-shadow: 0 0 0 9999px …`): tudo fora dele escurece e o que está
 * dentro continua nítido, sem precisar de máscara SVG.
 *
 * As imagens ficam em /public/capivara/<pose>.png: PNG com fundo
 * transparente, quadrado, a capivara centralizada. Enquanto o arquivo não
 * existir, entra uma patinha no lugar e o guia continua funcionando.
 */

/** Onde o painel se encaixa para não cobrir o que está sendo explicado. */
type Ancoragem = "baixo" | "cima";

interface Holofote {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Folga entre o holofote e o elemento aceso. */
const FOLGA = 8;

const CHAVE_AUTOMATICO = "vethub:guia:automatico";
const chaveVista = (rota: string) => `vethub:guia:visto:${rota}`;

function leu(chave: string): boolean {
  try {
    return localStorage.getItem(chave) !== null;
  } catch {
    // navegador com armazenamento bloqueado: o guia só não lembra nada
    return false;
  }
}

function anotar(chave: string) {
  try {
    localStorage.setItem(chave, "1");
  } catch {
    // sem armazenamento, sem anotação, não é motivo para quebrar a tela
  }
}

export function GuiaCapivara() {
  const pathname = usePathname();
  const { chave, passos } = useMemo(() => roteiroDaRota(pathname), [pathname]);

  // A `key` reinicia o guia inteiro ao trocar de página: passo volta ao
  // começo, holofote some, tudo limpo, sem um efeito para zerar estado.
  return <Guia key={chave} chave={chave} passos={passos} />;
}

function Guia({ chave, passos }: { chave: string; passos: Passo[] }) {
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [holofote, setHolofote] = useState<Holofote | null>(null);
  const [ancoragem, setAncoragem] = useState<Ancoragem>("baixo");
  const [semImagem, setSemImagem] = useState<Partial<Record<Pose, boolean>>>({});
  const [naoVisto, setNaoVisto] = useState(false);

  const balao = useRef<HTMLDivElement>(null);
  const passo = passos[indice] ?? passos[0];
  const ultimo = indice >= passos.length - 1;

  const fechar = useCallback(() => {
    setAberto(false);
    setIndice(0);
    anotar(chaveVista(chave));
    setNaoVisto(false);
  }, [chave]);

  const abrir = useCallback(() => {
    setIndice(0);
    setAberto(true);
  }, []);

  // Página nova (nunca vista) abre o guia sozinha, uma única vez. Quem
  // desligar o automático só vê o guia clicando no "?". O respiro de 700ms
  // deixa a página assentar antes de a capivara entrar em cena.
  useEffect(() => {
    if (leu(chaveVista(chave))) return;

    const relogio = setTimeout(() => {
      setNaoVisto(true);
      if (!leu(CHAVE_AUTOMATICO)) setAberto(true);
    }, 700);

    return () => clearTimeout(relogio);
  }, [chave]);

  // Leva o alvo para o meio da tela quando o passo muda.
  useEffect(() => {
    if (!aberto || !passo?.alvo) return;
    const alvo = document.querySelector<HTMLElement>(passo.alvo);
    alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [aberto, passo]);

  // O holofote persegue o alvo quadro a quadro: assim ele continua colado
  // no lugar certo enquanto a página rola, o menu abre ou a tela muda de
  // tamanho, sem um punhado de listeners para manter sincronizados.
  useEffect(() => {
    if (!aberto) return;
    let quadro = 0;

    function medir() {
      const alvo = passo?.alvo
        ? document.querySelector<HTMLElement>(passo.alvo)
        : null;

      // Elemento escondido (menu lateral no celular, botão só de admin…)
      // não tem retângulo: o passo vira uma fala centralizada.
      if (!alvo || alvo.getClientRects().length === 0) {
        setHolofote(null);
        setAncoragem("baixo");
      } else {
        const caixa = alvo.getBoundingClientRect();
        setHolofote((atual) =>
          atual &&
          atual.top === caixa.top &&
          atual.left === caixa.left &&
          atual.width === caixa.width &&
          atual.height === caixa.height
            ? atual
            : {
                top: caixa.top,
                left: caixa.left,
                width: caixa.width,
                height: caixa.height,
              }
        );
        // O painel foge para o lado com mais espaço livre.
        setAncoragem(
          caixa.top + caixa.height / 2 > window.innerHeight / 2 ? "cima" : "baixo"
        );
      }

      quadro = requestAnimationFrame(medir);
    }

    medir();
    return () => cancelAnimationFrame(quadro);
  }, [aberto, passo]);

  // Teclado: Esc sai, setas andam no roteiro.
  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") fechar();
      if (evento.key === "ArrowRight") {
        setIndice((i) => Math.min(i + 1, passos.length - 1));
      }
      if (evento.key === "ArrowLeft") setIndice((i) => Math.max(i - 1, 0));
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, fechar, passos.length]);

  useEffect(() => {
    if (aberto) balao.current?.focus();
  }, [aberto, indice]);

  if (!passo) return null;

  const pose: Pose = passo.pose ?? "explicando";

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={abrir}
        aria-label="Abrir o guia desta página"
        title="Como usar esta página"
        className="glass-forte fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex size-12 cursor-pointer items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:right-6 md:bottom-6"
      >
        {/* Enquanto a página nunca foi vista, a bolinha pulsa de leve */}
        {naoVisto && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-white/25 motion-reduce:hidden"
          />
        )}
        <CircleQuestionMark className="relative size-6" strokeWidth={2} />
      </button>
    );
  }

  return (
    <>
      {/* Camada que escurece e segura os cliques da página de trás */}
      <div className="fixed inset-0 z-[60]" aria-hidden>
        {holofote ? (
          <div
            className="absolute rounded-xl ring-2 ring-white/80"
            style={{
              top: holofote.top - FOLGA,
              left: holofote.left - FOLGA,
              width: holofote.width + FOLGA * 2,
              height: holofote.height + FOLGA * 2,
              boxShadow: "0 0 0 9999px rgb(2 20 15 / 0.62)",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[rgb(2_20_15_/_0.62)]" />
        )}
      </div>

      <div
        className={`fixed inset-x-3 z-[61] mx-auto flex max-w-md items-end gap-1 sm:inset-x-auto sm:right-6 sm:mx-0 sm:w-[27rem] sm:max-w-none ${
          ancoragem === "cima"
            ? "top-4 md:top-6"
            : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6"
        }`}
      >
        {/* A capivara: caixa quadrada e object-contain, ela nunca é cortada,
            só encolhe se a tela apertar. */}
        <div className="relative size-24 shrink-0 sm:size-32">
          {semImagem[pose] ? (
            <span className="glass-forte flex size-full items-center justify-center rounded-full text-white">
              <PawPrint className="size-8" strokeWidth={1.8} aria-hidden />
            </span>
          ) : (
            <Image
              src={`/capivara/${pose}.png`}
              alt="Bento, a capivara mascote do VetHub"
              width={1024}
              height={1024}
              sizes="128px"
              priority
              onError={() => setSemImagem((atual) => ({ ...atual, [pose]: true }))}
              className="size-full object-contain object-bottom drop-shadow-[0_10px_20px_rgb(0_0_0_/_0.45)]"
            />
          )}
        </div>

        <div
          ref={balao}
          role="dialog"
          aria-modal="true"
          aria-label="Guia do VetHub"
          tabIndex={-1}
          className="glass-menu relative min-w-0 flex-1 rounded-2xl p-4 outline-none"
        >
          {/* Rabinho do balão, apontando para a capivara */}
          <span
            aria-hidden
            className="glass-menu absolute -left-1.5 bottom-8 size-3 rotate-45 rounded-[3px]"
          />

          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar o guia"
            className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <X className="size-4" strokeWidth={2} />
          </button>

          <p className="pr-8 text-sm font-bold text-white">{passo.titulo}</p>
          <p className="mt-1 text-sm leading-relaxed text-white/85">
            {passo.texto}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5" aria-hidden>
              {passos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === indice ? "w-4 bg-white" : "w-1.5 bg-white/35"
                  }`}
                />
              ))}
            </div>

            {indice > 0 && (
              <Button
                variante="ghost"
                tamanho="sm"
                onClick={() => setIndice((i) => Math.max(i - 1, 0))}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Voltar
              </Button>
            )}

            <Button
              tamanho="sm"
              onClick={() => (ultimo ? fechar() : setIndice((i) => i + 1))}
            >
              {ultimo ? "Entendi!" : "Próximo"}
              {!ultimo && <ChevronRight className="size-4" aria-hidden />}
            </Button>
          </div>

          <p className="mt-2 text-center">
            <button
              type="button"
              onClick={() => {
                anotar(CHAVE_AUTOMATICO);
                fechar();
              }}
              className="cursor-pointer text-[11px] text-white/55 underline-offset-2 hover:text-white/85 hover:underline"
            >
              Não abrir sozinho nas outras páginas
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
