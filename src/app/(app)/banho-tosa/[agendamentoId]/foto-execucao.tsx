"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleAlert, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { salvarFotoExecucao } from "../actions";

const TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB (limite do bucket "fotos")
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

const EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Foto de antes/depois do banho e tosa. O arquivo sobe direto do navegador
 * para o bucket público "fotos" (chave anon + policy por clínica) e a URL
 * é gravada na execução. É o argumento de venda do petshop: mostrar o
 * resultado para o tutor.
 */
export function FotoExecucao({
  agendamentoId,
  clinicaId,
  campo,
  rotulo,
  url,
  petNome,
}: {
  agendamentoId: string;
  clinicaId: string;
  campo: "antes" | "depois";
  rotulo: string;
  url: string | null;
  petNome: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File) {
    setErro(null);

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro("Formato não aceito — use JPG, PNG ou WebP.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      setErro("Imagem muito grande — máximo 5 MB.");
      return;
    }

    setEnviando(true);
    try {
      const supabase = createClient();
      const ext = EXTENSAO[arquivo.type] ?? "jpg";
      const caminho = `${clinicaId}/banho-tosa/${crypto.randomUUID()}.${ext}`;

      const { error: erroUpload } = await supabase.storage
        .from("fotos")
        .upload(caminho, arquivo);
      if (erroUpload) {
        setErro("Não foi possível enviar a foto.");
        return;
      }

      const { data } = supabase.storage.from("fotos").getPublicUrl(caminho);
      const resultado = await salvarFotoExecucao(
        agendamentoId,
        campo,
        data.publicUrl
      );
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }

      router.refresh();
    } catch {
      setErro("Não foi possível enviar a foto.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-sm font-medium text-ink">{rotulo}</p>

      <button
        type="button"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        aria-label={
          url
            ? `Trocar a foto de ${rotulo.toLowerCase()} de ${petNome}`
            : `Enviar foto de ${rotulo.toLowerCase()} de ${petNome}`
        }
        className="group relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white/10 backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none"
      >
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={`${petNome} — ${rotulo.toLowerCase()}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-2 text-center text-white/80">
            <Camera className="size-7" strokeWidth={1.6} aria-hidden />
            <span className="text-xs">Tirar ou escolher foto</span>
          </span>
        )}

        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity ${
            enviando ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {enviando ? (
            <LoaderCircle className="size-6 animate-spin" strokeWidth={1.8} />
          ) : (
            url && <Camera className="size-6" strokeWidth={1.8} />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) enviar(arquivo);
        }}
        aria-label={`Escolher foto de ${rotulo.toLowerCase()}`}
        className="sr-only"
      />

      {erro ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-100">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {erro}
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-muted">
          {enviando ? "Enviando…" : "JPG, PNG ou WebP · até 5 MB"}
        </p>
      )}
    </div>
  );
}
