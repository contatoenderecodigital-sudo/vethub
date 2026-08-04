"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { ROTULO_STATUS_AGENDAMENTO } from "@/lib/format";
import { STATUS_AGENDAMENTO_ORDEM, type AgendamentoStatus } from "@/lib/types";
import { mudarStatus } from "./actions";

/**
 * Cores da pílula por status (mesma leitura do kanban da Peti9).
 * Tons claros sobre o vidro: fundo translúcido + texto quase branco.
 */
const CORES: Record<AgendamentoStatus, string> = {
  agendado: "bg-cyan-300/25 text-cyan-50 border-cyan-100/30",
  check_in: "bg-amber-300/30 text-amber-50 border-amber-100/30",
  atendido: "bg-white/25 text-white border-white/40",
  pronto: "bg-violet-300/30 text-violet-50 border-violet-100/30",
  check_out: "bg-emerald-300/25 text-emerald-50 border-emerald-100/30",
  cancelado: "bg-red-400/30 text-red-50 border-red-200/30",
};

/**
 * Seletor de status direto na linha da agenda: mostra o status atual como
 * pílula colorida e, ao clicar, abre o menu com os status possíveis.
 * Ao escolher, chama a server action e atualiza a lista (router.refresh).
 */
export function StatusSelect({
  id,
  status,
  className = "",
}: {
  id: string;
  status: AgendamentoStatus;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const router = useRouter();

  const raiz = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const itens = useRef<(HTMLButtonElement | null)[]>([]);

  // fecha ao clicar fora (mesmo padrão do BuscaCombobox)
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  // ao abrir, o foco vai para o status atual (navegação por teclado)
  useEffect(() => {
    if (!aberto) return;
    const atual = STATUS_AGENDAMENTO_ORDEM.indexOf(status);
    itens.current[atual >= 0 ? atual : 0]?.focus();
  }, [aberto, status]);

  function fechar() {
    setAberto(false);
    gatilho.current?.focus();
  }

  function escolher(novo: AgendamentoStatus) {
    setAberto(false);
    setErro(null);
    gatilho.current?.focus();
    if (novo === status) return;

    iniciarTransicao(async () => {
      const resultado = await mudarStatus(id, novo);
      if (resultado?.erro) setErro(resultado.erro);
      else router.refresh();
    });
  }

  /** Setas circulam pelos itens; Esc fecha; Home/End vão às pontas. */
  function aoTeclarNoMenu(e: React.KeyboardEvent, indice: number) {
    const total = STATUS_AGENDAMENTO_ORDEM.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const passo = e.key === "ArrowDown" ? 1 : -1;
      itens.current[(indice + passo + total) % total]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itens.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itens.current[total - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      fechar();
    } else if (e.key === "Tab") {
      setAberto(false);
    }
  }

  return (
    <div ref={raiz} className={`relative ${className}`}>
      <button
        ref={gatilho}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Situação: ${ROTULO_STATUS_AGENDAMENTO[status]}. Clique para alterar.`}
        disabled={pendente}
        onClick={() => setAberto((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !aberto) {
            e.preventDefault();
            setAberto(true);
          }
        }}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 max-sm:min-h-9 max-sm:px-3 ${CORES[status]}`}
      >
        {pendente ? "Salvando…" : ROTULO_STATUS_AGENDAMENTO[status]}
        <ChevronDown className="size-3.5 shrink-0" aria-hidden />
      </button>

      {aberto && (
        <ul
          role="menu"
          aria-label="Alterar situação"
          className="glass-forte absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl py-1"
        >
          {STATUS_AGENDAMENTO_ORDEM.map((s, i) => (
            <li key={s} role="none">
              <button
                ref={(el) => {
                  itens.current[i] = el;
                }}
                role="menuitem"
                type="button"
                onClick={() => escolher(s)}
                onKeyDown={(e) => aoTeclarNoMenu(e, i)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
              >
                <span
                  className={`size-2.5 shrink-0 rounded-full border ${CORES[s]}`}
                  aria-hidden
                />
                <span className="flex-1">{ROTULO_STATUS_AGENDAMENTO[s]}</span>
                {s === status && <Check className="size-4 shrink-0" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {erro && (
        <p
          role="alert"
          className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-red-300/40 bg-red-400/30 px-2 py-1 text-xs font-medium text-red-50 backdrop-blur-md"
        >
          {erro}
        </p>
      )}
    </div>
  );
}
