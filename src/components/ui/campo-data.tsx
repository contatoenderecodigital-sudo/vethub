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
 * sistema operacional: caixa escura, fonte diferente, ignora o tema. Aqui o
 * calendário é nosso, em vidro, em português e com a cor do tema ativo.
 *
 * O campo é DIGITÁVEL. Antes era só um botão, e isso custava caro: para
 * registrar o nascimento de um pet de 10 anos era preciso clicar 120 vezes
 * na setinha de mês, um mês por vez. Quem sabe a data escreve 15/03/2016 em
 * dois segundos; o calendário fica para quem quer procurar no mês.
 *
 * Dentro do calendário, mês e ano viraram listas. Navegar de ano em ano por
 * seta é o mesmo problema em menor escala.
 *
 * Para o formulário, o valor viaja num <input type="hidden"> no formato
 * YYYY-MM-DD, igual ao que o input nativo enviava: nada muda no servidor.
 *
 * Datas são texto YYYY-MM-DD convertido para Date ao meio-dia, para o fuso
 * nunca empurrar o dia para trás.
 */

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Quantos anos para trás e para frente as listas oferecem por padrão. */
const ANOS_PARA_TRAS = 100;
const ANOS_PARA_FRENTE = 10;

function paraData(iso: string | undefined): Date | undefined {
  if (!iso || !RE_ISO.test(iso)) return undefined;
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia, 12);
  // Rejeita 31/02: o Date "conserta" para 03/03 e mudaria o mês.
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return undefined;
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

/** Vai pondo as barras enquanto a pessoa digita: 15032016 → 15/03/2016. */
function mascaraData(bruto: string): string {
  const d = bruto.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "15/03/2016" → "2016-03-15". Devolve "" enquanto a data não existir. */
function textoParaISO(texto: string): string {
  const [dia, mes, ano] = texto.split("/");
  if (!dia || !mes || !ano || ano.length !== 4) return "";
  const iso = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  return paraData(iso) ? iso : "";
}

export interface CampoDataProps {
  /** Nome enviado no formulário (vai num input escondido). */
  name?: string;
  id?: string;
  /** Valor inicial em YYYY-MM-DD (modo não controlado). */
  defaultValue?: string;
  /** Valor em YYYY-MM-DD (modo controlado, use com react-hook-form). */
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

  /** O que está escrito na caixa, que nem sempre é uma data válida ainda. */
  const [texto, setTexto] = useState(() => paraTexto(iso));

  // Valor mudou por fora (reset do formulário, botão Hoje, cálculo da próxima
  // dose): a caixa acompanha. Ajustar estado durante o render é o padrão do
  // React para isto — de dentro de um efeito causaria um render a mais.
  const [isoConhecido, setIsoConhecido] = useState(iso);
  if (iso !== isoConhecido) {
    setIsoConhecido(iso);
    setTexto(paraTexto(iso));
  }

  function definir(novo: string) {
    if (!controlado) setInterno(novo);
    onChange?.(novo);
  }

  function aoDigitar(bruto: string) {
    const mascarado = mascaraData(bruto);
    setTexto(mascarado);

    // Só avisa o formulário quando a data existe de verdade. Apagar tudo
    // limpa o campo; digitar pela metade não dispara nada.
    if (!mascarado) definir("");
    else {
      const novo = textoParaISO(mascarado);
      if (novo) definir(novo);
    }
  }

  /** Ao sair do campo, texto pela metade volta ao último valor válido. */
  function aoSair() {
    setTexto(paraTexto(iso));
  }

  const anoBase = (selecionada ?? new Date()).getFullYear();
  const limiteInicio = paraData(min)?.getFullYear() ?? anoBase - ANOS_PARA_TRAS;
  const limiteFim = paraData(max)?.getFullYear() ?? anoBase + ANOS_PARA_FRENTE;

  return (
    <div className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={iso} />}

      <div
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border border-white/30 bg-white/15 px-3",
          "text-sm text-white backdrop-blur-sm transition-colors",
          "focus-within:border-white/60 focus-within:outline-2 focus-within:outline-white/40",
          disabled && "bg-white/10 text-white/50"
        )}
        data-invalido={aria["aria-invalid"] ? "" : undefined}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={texto}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          aria-label={aria["aria-label"]}
          aria-invalid={aria["aria-invalid"]}
          onChange={(e) => aoDigitar(e.target.value)}
          onBlur={aoSair}
          className="min-w-0 flex-1 bg-transparent text-white placeholder:text-white/55 focus:outline-none disabled:text-white/50"
        />

        {iso && !required && !disabled && (
          <button
            type="button"
            aria-label="Limpar data"
            onClick={() => {
              definir("");
              setTexto("");
            }}
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-white/75 hover:bg-white/20 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        )}

        <Popover.Root open={aberto} onOpenChange={setAberto}>
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Abrir calendário"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded text-white/70 hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-white/40 sm:size-8"
            >
              <CalendarDays className="size-4" strokeWidth={1.8} aria-hidden />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            {/* Sem a classe de animação da janela modal aqui: ela aplica
                translate(-50%,-50%) para centralizar, e o Radix também usa
                transform para posicionar o popover. Os dois brigando faziam
                o calendário piscar e saltar de lugar. */}
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
                /* Mês e ano viram listas: ninguém navega 10 anos de seta. */
                captionLayout="dropdown"
                startMonth={new Date(limiteInicio, 0)}
                endMonth={new Date(limiteFim, 11)}
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
    </div>
  );
}
