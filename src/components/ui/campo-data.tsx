"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

/**
 * Campo de data do VetHub.
 *
 * O <input type="date"> do navegador abre um calendário desenhado pelo
 * sistema operacional — caixa escura, fonte diferente, ignora o tema.
 * Aqui o campo é um botão que abre um calendário nosso, em vidro, em
 * português e com a cor do tema ativo.
 *
 * Para o formulário, o valor viaja num <input type="hidden"> no formato
 * YYYY-MM-DD, igual ao que o input nativo enviava — então nada muda do
 * lado do servidor.
 *
 * Datas são tratadas como texto YYYY-MM-DD e convertidas para Date com
 * hora do meio-dia: assim o fuso nunca empurra o dia para trás.
 */

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;

function paraData(iso: string | undefined): Date | undefined {
  if (!iso || !RE_ISO.test(iso)) return undefined;
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia, 12);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function paraISO(data: Date | undefined): string {
  if (!data) return "";
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function paraTexto(iso: string): string {
  if (!RE_ISO.test(iso)) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export interface CampoDataProps {
  /** Nome enviado no formulário (vai num input escondido). */
  name?: string;
  id?: string;
  /** Valor inicial em YYYY-MM-DD (modo não controlado). */
  defaultValue?: string;
  /** Valor em YYYY-MM-DD (modo controlado — use com react-hook-form). */
  value?: string;
  onChange?: (iso: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
}

export function CampoData({
  name,
  id,
  defaultValue = "",
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  placeholder = "dd/mm/aaaa",
  className,
  ...aria
}: CampoDataProps) {
  const [interno, setInterno] = useState(defaultValue);
  const [aberto, setAberto] = useState(false);

  const controlado = value !== undefined;
  const iso = controlado ? value : interno;
  const selecionada = paraData(iso);

  function definir(novo: string) {
    if (!controlado) setInterno(novo);
    onChange?.(novo);
  }

  return (
    <div className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={iso} />}

      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            // O botão é a caixa do campo; quando o valor está inválido o
            // formulário marca aqui para leitor de tela e para o estilo.
            aria-describedby={aria["aria-invalid"] ? `${id}-erro` : undefined}
            data-invalido={aria["aria-invalid"] ? "" : undefined}
            aria-label={aria["aria-label"]}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-lg border border-white/30 bg-white/15 px-3",
              "text-left text-sm text-white backdrop-blur-sm transition-colors",
              "hover:bg-white/20 focus-visible:border-white/60 focus-visible:outline-2",
              "focus-visible:outline-white/40 disabled:bg-white/10 disabled:text-white/50",
              !iso && "text-white/55"
            )}
          >
            <CalendarDays
              className="size-4 shrink-0 text-white/70"
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">
              {iso ? paraTexto(iso) : placeholder}
            </span>
            {iso && !required && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Limpar data"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  definir("");
                }}
                className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white"
              >
                <X className="size-3.5" />
              </span>
            )}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          {/* Sem a classe de animação da janela modal aqui: ela aplica
              translate(-50%,-50%) para centralizar, e o Radix também usa
              transform para posicionar o popover. Os dois brigando faziam
              o calendário piscar e saltar de lugar. O popover só desmaia
              (opacidade), sem mexer em transform. */}
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="popover-vidro glass-menu z-50 rounded-2xl p-3 select-none"
          >
            <DayPicker
              mode="single"
              locale={ptBR}
              selected={selecionada}
              defaultMonth={selecionada}
              /* Sempre seis semanas: sem isso a altura muda de mês para
                 mês e o popover se reposiciona a cada navegação. */
              fixedWeeks
              disabled={[
                ...(min ? [{ before: paraData(min)! }] : []),
                ...(max ? [{ after: paraData(max)! }] : []),
              ]}
              onSelect={(data) => {
                definir(paraISO(data));
                setAberto(false);
              }}
              showOutsideDays
              className="calendario-vidro"
            />
            <div className="mt-1 flex justify-between border-t border-white/20 pt-2">
              <button
                type="button"
                onClick={() => {
                  definir("");
                  setAberto(false);
                }}
                className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  definir(paraISO(new Date()));
                  setAberto(false);
                }}
                className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-white hover:bg-white/20"
              >
                Hoje
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
