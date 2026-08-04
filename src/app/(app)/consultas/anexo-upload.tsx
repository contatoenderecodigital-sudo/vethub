"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AnexoTipo } from "@/lib/types";
import { registrarAnexo } from "./actions";

const TAMANHO_MAX = 10 * 1024 * 1024; // 10 MB
const TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/** O tipo é detectado sozinho: imagem → foto, PDF → documento. */
function tipoDoArquivo(arquivo: File): AnexoTipo {
  return arquivo.type === "application/pdf" ? "pdf" : "foto";
}

/**
 * Zona única de anexos: clica em qualquer lugar OU arrasta os arquivos
 * para cima dela e o envio começa na hora — vários de uma vez, sem
 * escolher tipo nem apertar botão. Upload direto do navegador para o
 * bucket privado "anexos" (chave anon + RLS).
 */
export function AnexoUpload({
  consultaId,
  clinicaId,
  compacta = false,
}: {
  consultaId: string;
  clinicaId: string;
  /** true quando já existem anexos (zona menor, abaixo da grade) */
  compacta?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviandoQuantos, setEnviandoQuantos] = useState(0);
  const [erros, setErros] = useState<string[]>([]);

  async function enviarArquivos(lista: FileList | File[]) {
    const arquivos = Array.from(lista);
    if (arquivos.length === 0) return;

    setErros([]);
    const falhas: string[] = [];
    setEnviandoQuantos(arquivos.length);

    const supabase = createClient();

    // envia em sequência (conexões de clínica costumam ser modestas)
    for (const arquivo of arquivos) {
      if (!TIPOS_ACEITOS.includes(arquivo.type)) {
        falhas.push(`${arquivo.name}: formato não aceito (use JPG, PNG, WebP ou PDF).`);
        continue;
      }
      if (arquivo.size > TAMANHO_MAX) {
        falhas.push(`${arquivo.name}: muito grande (máximo 10 MB).`);
        continue;
      }

      try {
        const ext =
          arquivo.name.split(".").pop()?.toLowerCase() ||
          (arquivo.type === "application/pdf" ? "pdf" : "jpg");
        const caminho = `${clinicaId}/${consultaId}/${crypto.randomUUID()}.${ext}`;

        const { error: erroUpload } = await supabase.storage
          .from("anexos")
          .upload(caminho, arquivo);
        if (erroUpload) {
          falhas.push(`${arquivo.name}: falha no envio.`);
          continue;
        }

        const resultado = await registrarAnexo(
          consultaId,
          tipoDoArquivo(arquivo),
          caminho,
          arquivo.name
        );
        if (resultado.erro) falhas.push(`${arquivo.name}: ${resultado.erro}`);
      } catch {
        falhas.push(`${arquivo.name}: falha no envio.`);
      } finally {
        setEnviandoQuantos((atual) => atual - 1);
      }
    }

    setErros(falhas);
    if (inputRef.current) inputRef.current.value = "";
    if (falhas.length < arquivos.length) router.refresh();
  }

  const enviando = enviandoQuantos > 0;

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (!enviando) enviarArquivos(e.dataTransfer.files);
        }}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center backdrop-blur-sm transition-colors ${
          compacta ? "px-4 py-6" : "px-6 py-12"
        } ${
          arrastando
            ? "border-brand bg-white/15"
            : "border-edge bg-white/40 hover:border-brand/50 hover:bg-white/10"
        } ${enviando ? "pointer-events-none opacity-70" : ""}`}
      >
        <span
          className={`flex items-center justify-center rounded-full bg-white/20 text-white ${
            compacta ? "size-10" : "size-14"
          }`}
        >
          {enviando ? (
            <LoaderCircle
              className={`animate-spin ${compacta ? "size-5" : "size-7"}`}
              strokeWidth={1.8}
            />
          ) : (
            <Upload className={compacta ? "size-5" : "size-7"} strokeWidth={1.8} />
          )}
        </span>
        <span className="text-sm font-semibold text-ink">
          {enviando
            ? `Enviando ${enviandoQuantos} arquivo${enviandoQuantos > 1 ? "s" : ""}…`
            : "Clique para anexar ou arraste os arquivos aqui"}
        </span>
        <span className="text-xs text-ink-muted">
          Fotos e PDFs de exames · vários de uma vez · máximo 10 MB cada
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => e.target.files && enviarArquivos(e.target.files)}
        aria-label="Anexar arquivos"
        className="sr-only"
      />

      {erros.length > 0 && (
        <ul className="mt-2 space-y-1">
          {erros.map((e) => (
            <li key={e} className="flex items-start gap-1.5 text-sm text-red-100">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
