"use client";

import { useState } from "react";
import { CampoData } from "@/components/ui/campo-data";
import { Campo, Input, Select } from "@/components/ui/form";

/**
 * Nome do produto e datas do protocolo, com a próxima dose calculada.
 *
 * Antes o nome era texto livre e a próxima dose ficava em branco: ninguém
 * calcula reforço de cabeça no balcão. O resultado é que o relatório
 * "Vacinas a vencer" — uma das melhores ferramentas de recompra que a
 * clínica tem — vivia zerado, não por falta de vacina aplicada, mas por
 * falta da data do reforço.
 *
 * Agora, escolher a vacina do catálogo preenche o nome e joga a data do
 * reforço para a frente, usando o intervalo cadastrado no item. O campo
 * continua editável, e quem quiser digitar um produto fora do catálogo
 * escolhe "Outro" — clínica nenhuma cadastra tudo no primeiro dia.
 */

export interface VacinaDoCatalogo {
  id: string;
  nome: string;
  intervalo_dose_dias: number | null;
}

/** Soma dias a uma data YYYY-MM-DD sem tropeçar em fuso. */
function somarDias(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  if (!ano || !mes || !dia) return "";
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function CamposProtocolo({
  hoje,
  catalogo,
}: {
  hoje: string;
  catalogo: VacinaDoCatalogo[];
}) {
  const [itemId, setItemId] = useState("");
  const [nome, setNome] = useState("");
  const [aplicacao, setAplicacao] = useState(hoje);
  const [proxima, setProxima] = useState("");
  /** Depois que a pessoa mexe na data à mão, o cálculo para de mandar. */
  const [proximaEditada, setProximaEditada] = useState(false);

  const escolhido = catalogo.find((c) => c.id === itemId) ?? null;

  function recalcular(idEscolhido: string, dataAplicacao: string) {
    if (proximaEditada) return;
    const item = catalogo.find((c) => c.id === idEscolhido);
    if (!item?.intervalo_dose_dias || !dataAplicacao) return;
    setProxima(somarDias(dataAplicacao, item.intervalo_dose_dias));
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          rotulo="Produto do catálogo"
          htmlFor="protocolo-item"
          dica={
            escolhido?.intervalo_dose_dias
              ? `Reforço a cada ${escolhido.intervalo_dose_dias} dias.`
              : "Escolher do catálogo já calcula o reforço."
          }
        >
          <Select
            id="protocolo-item"
            name="item_id"
            value={itemId}
            onChange={(e) => {
              const id = e.target.value;
              setItemId(id);
              const item = catalogo.find((c) => c.id === id);
              if (item) setNome(item.nome);
              recalcular(id, aplicacao);
            }}
          >
            <option value="">Outro (digitar o nome)</option>
            {catalogo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo rotulo="Nome do produto" htmlFor="protocolo-nome" obrigatorio>
          <Input
            id="protocolo-nome"
            name="nome"
            placeholder="Ex.: V10, Bravecto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Data de aplicação" htmlFor="protocolo-aplicacao" obrigatorio>
          <CampoData
            id="protocolo-aplicacao"
            name="data_aplicacao"
            value={aplicacao}
            onChange={(valor) => {
              setAplicacao(valor);
              recalcular(itemId, valor);
            }}
            min="1980-01-01"
            max={hoje}
            required
          />
        </Campo>

        <Campo
          rotulo="Próxima dose"
          htmlFor="protocolo-proxima"
          dica="Alimenta o relatório de vacinas a vencer e os lembretes."
        >
          <CampoData
            id="protocolo-proxima"
            name="proxima_dose"
            value={proxima}
            onChange={(valor) => {
              setProxima(valor);
              setProximaEditada(true);
            }}
            min="1980-01-01"
          />
        </Campo>
      </div>
    </>
  );
}
