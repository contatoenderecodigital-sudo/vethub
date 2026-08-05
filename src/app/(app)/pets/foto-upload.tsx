"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleAlert, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { IconeEspecie } from "@/components/icone-especie";
import { atualizarFoto } from "./actions";

const TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB (limite do bucket "fotos")
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

const EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Foto do pet: avatar circular clicável. Escolheu o arquivo, já sobe para o
 * bucket público "fotos" direto do navegador (chave anon + policy por
 * clínica) e grava a URL no pet. Sem foto, mostra o ícone da espécie.
 */
export function FotoUpload({
  petId,
  clinicaId,
  especie,
  fotoUrl,
  nome,
}: {
  petId: string;
  clinicaId: string;
  especie: string | null | undefined;
  fotoUrl: string | null;
  nome: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File) {
    setErro(null);

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro("Formato não aceito. Use JPG, PNG ou WebP.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      setErro("Imagem muito grande. O máximo é 5 MB.");
      return;
    }

    setEnviando(true);
    try {
      const supabase = createClient();
      const ext = EXTENSAO[arquivo.type] ?? "jpg";
      const caminho = `${clinicaId}/pets/${crypto.randomUUID()}.${ext}`;

      const { error: erroUpload } = await supabase.storage
        .from("fotos")
        .upload(caminho, arquivo);
      if (erroUpload) {
        setErro("Não foi possível enviar a foto.");
        return;
      }

      const { data } = supabase.storage.from("fotos").getPublicUrl(caminho);
      const resultado = await atualizarFoto(petId, data.publicUrl);
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
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        aria-label={fotoUrl ? `Trocar a foto de ${nome}` : `Adicionar foto de ${nome}`}
        className="group relative size-24 shrink-0 cursor-pointer overflow-hidden rounded-full border border-white/40 bg-white/15 backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none sm:size-28"
      >
        {fotoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={fotoUrl}
            alt={`Foto de ${nome}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center">
            <IconeEspecie especie={especie} tamanho="lg" />
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
            <Camera className="size-6" strokeWidth={1.8} />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) enviar(arquivo);
        }}
        aria-label="Escolher foto do pet"
        className="sr-only"
      />

      {erro ? (
        <p className="flex items-center gap-1 text-center text-xs text-red-100">
          <CircleAlert className="size-3.5 shrink-0" />
          {erro}
        </p>
      ) : (
        <p className="text-xs text-ink-muted">
          {enviando ? "Enviando…" : "JPG, PNG ou WebP · até 5 MB"}
        </p>
      )}
    </div>
  );
}
