"use client";

import { useState } from "react";
import { Clock, Stethoscope, User } from "lucide-react";
import { formatHora } from "@/lib/format";
import { IconeEspecie } from "@/components/icone-especie";

/** Linha do agendamento usada pelo cartão do kanban. */
export interface CartaoDados {
  id: string;
  data_hora: string;
  etiquetas: string[] | null;
  pet: {
    nome: string;
    especie: string;
    raca: string | null;
    foto_url: string | null;
    tutor: { nome: string } | null;
  } | null;
  veterinario: { nome: string } | null;
}

/** Número curto do atendimento: 4 últimos caracteres do id, em maiúsculas. */
export function numeroCurto(id: string): string {
  return `#${id.slice(-4).toUpperCase()}`;
}

/** Data curta (dd/mm) no fuso da clínica. */
function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Cartão arrastável do kanban. Usa drag and drop nativo do HTML5:
 * o id do agendamento viaja no dataTransfer e a coluna de destino
 * lê esse id no onDrop.
 */
export function CartaoAgendamento({ agendamento }: { agendamento: CartaoDados }) {
  const [arrastando, setArrastando] = useState(false);
  const { pet, veterinario } = agendamento;
  const etiquetas = agendamento.etiquetas ?? [];

  const especieRaca = [pet?.especie, pet?.raca].filter(Boolean).join(" · ");

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", agendamento.id);
        e.dataTransfer.effectAllowed = "move";
        setArrastando(true);
      }}
      onDragEnd={() => setArrastando(false)}
      className={`glass cursor-grab rounded-xl p-3 transition-opacity active:cursor-grabbing ${
        arrastando ? "opacity-50" : "opacity-100"
      }`}
      aria-label={`Agendamento ${numeroCurto(agendamento.id)} — ${pet?.nome ?? "Pet"}`}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold tracking-wide text-white/80">
          {numeroCurto(agendamento.id)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
          <Clock className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          <span className="font-semibold tabular-nums text-white">
            {formatHora(agendamento.data_hora)}
          </span>
          <span className="tabular-nums">{dataCurta(agendamento.data_hora)}</span>
        </span>
      </header>

      <div className="mt-2 flex items-center gap-2.5">
        {pet?.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pet.foto_url}
            alt={pet.nome}
            className="size-10 shrink-0 rounded-full object-cover ring-1 ring-white/40"
          />
        ) : (
          <IconeEspecie especie={pet?.especie} />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{pet?.nome ?? "Pet"}</p>
          {especieRaca && (
            <p className="truncate text-xs text-ink-muted">{especieRaca}</p>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1 text-xs text-ink-muted">
        <p className="flex min-w-0 items-center gap-1.5">
          <User className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          <span className="truncate">{pet?.tutor?.nome ?? "Sem tutor"}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <Stethoscope className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          <span className="truncate">
            {veterinario?.nome ?? "Sem profissional"}
          </span>
        </p>
      </div>

      {etiquetas.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {etiquetas.map((etiqueta) => (
            <li
              key={etiqueta}
              className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-medium text-white"
            >
              {etiqueta}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
