"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { CategoriaTipo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { excluirCategoria, renomearCategoria } from "./actions";

/**
 * Linha da lista de categorias: mostra o nome e troca para um campo de texto
 * quando o usuário clica em editar (renomear inline, sem sair da página).
 */
export function CategoriaItem({
  id,
  nome,
  tipo,
  podeEditar,
  ehAdmin,
}: {
  id: string;
  nome: string;
  tipo: CategoriaTipo;
  podeEditar: boolean;
  ehAdmin: boolean;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <li className="py-2">
        <form
          action={renomearCategoria.bind(null, id, tipo)}
          className="flex items-center gap-2"
        >
          <Input
            name="nome"
            defaultValue={nome}
            required
            maxLength={40}
            autoFocus
            aria-label={`Novo nome para ${nome}`}
          />
          <SubmitButton tamanho="sm" carregando="…">
            <Check className="size-4" />
            <span className="sr-only">Salvar</span>
          </SubmitButton>
          <Button
            type="button"
            variante="ghost"
            tamanho="sm"
            onClick={() => setEditando(false)}
            aria-label="Cancelar edição"
          >
            <X className="size-4" />
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{nome}</span>

      {podeEditar && (
        <Button
          type="button"
          variante="ghost"
          tamanho="sm"
          onClick={() => setEditando(true)}
          aria-label={`Editar ${nome}`}
        >
          <Pencil className="size-4" />
        </Button>
      )}

      {ehAdmin && (
        <form action={excluirCategoria.bind(null, id)}>
          <ConfirmButton
            variante="ghost"
            tamanho="sm"
            mensagem={`Excluir a categoria "${nome}"? As contas dela ficam sem categoria.`}
            aria-label={`Excluir ${nome}`}
          >
            <Trash2 className="size-4" />
          </ConfirmButton>
        </form>
      )}
    </li>
  );
}
