"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { AnexoTipo } from "@/lib/types";
import { registrarAnexo } from "./actions";

const TAMANHO_MAX = 10 * 1024 * 1024; // 10 MB
const TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/** Upload direto do navegador para o bucket privado "anexos" (chave anon + RLS). */
export function AnexoUpload({
  consultaId,
  clinicaId,
}: {
  consultaId: string;
  clinicaId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<AnexoTipo>("foto");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    setErro(null);
    const arquivo = inputRef.current?.files?.[0];

    if (!arquivo) {
      setErro("Selecione um arquivo.");
      return;
    }
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro("Formato não aceito. Use JPG, PNG, WebP ou PDF.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      setErro("Arquivo muito grande (máximo 10 MB).");
      return;
    }

    setEnviando(true);
    try {
      const supabase = createClient();
      const ext =
        arquivo.name.split(".").pop()?.toLowerCase() ||
        (arquivo.type === "application/pdf" ? "pdf" : "jpg");
      const caminho = `${clinicaId}/${consultaId}/${crypto.randomUUID()}.${ext}`;

      const { error: erroUpload } = await supabase.storage
        .from("anexos")
        .upload(caminho, arquivo);

      if (erroUpload) {
        setErro("Falha ao enviar o arquivo. Tente novamente.");
        return;
      }

      const resultado = await registrarAnexo(
        consultaId,
        tipo,
        caminho,
        arquivo.name
      );
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }

      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setErro("Falha ao enviar o arquivo. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-edge p-3">
      <p className="mb-2 text-sm font-medium text-ink">Adicionar anexo</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          aria-label="Tipo do anexo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as AnexoTipo)}
          className="sm:w-32"
          disabled={enviando}
        >
          <option value="foto">Foto</option>
          <option value="pdf">PDF</option>
          <option value="exame">Exame</option>
        </Select>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={enviando}
          onChange={() => setErro(null)}
          aria-label="Arquivo do anexo"
          className="w-full cursor-pointer text-sm text-ink-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-mint/30 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-dark hover:file:bg-brand-mint/50"
        />
        <Button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="shrink-0"
        >
          {enviando ? "Enviando…" : "Enviar"}
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">
        JPG, PNG, WebP ou PDF · máximo 10 MB.
      </p>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}
