"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botão que abre o Embedded Signup oficial da Meta.
 * Fluxo: popup da Meta (login do Facebook da clínica → criar/escolher a
 * conta WhatsApp Business → número) → o popup nos envia os IDs por
 * postMessage e o FB.login retorna um `code` → mandamos tudo ao servidor,
 * que troca o code pelo token (o token nunca passa pelo navegador).
 */

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        cb: (resposta: {
          authResponse?: { code?: string };
          status?: string;
        }) => void,
        opts: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function ConectarWhatsapp({
  appId,
  configId,
}: {
  appId: string;
  configId: string;
}) {
  const router = useRouter();
  // SDK já carregado (navegação de volta à página) é detectado na montagem
  const [pronto, setPronto] = useState(
    () => typeof window !== "undefined" && Boolean(window.FB)
  );
  const [conectando, setConectando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // IDs chegam por postMessage antes de o FB.login devolver o code
  const sessao = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  // Carrega o SDK do Facebook uma única vez
  useEffect(() => {
    if (window.FB) return; // já carregado — `pronto` veio true do initializer
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v23.0",
      });
      setPronto(true);
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, [appId]);

  // Escuta a sessão do Embedded Signup (waba_id / phone_number_id)
  useEffect(() => {
    function aoReceberMensagem(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const dados = JSON.parse(event.data as string);
        if (dados.type === "WA_EMBEDDED_SIGNUP" && dados.event === "FINISH") {
          sessao.current = {
            waba_id: dados.data?.waba_id,
            phone_number_id: dados.data?.phone_number_id,
          };
        }
      } catch {
        // mensagens de outros scripts — ignorar
      }
    }
    window.addEventListener("message", aoReceberMensagem);
    return () => window.removeEventListener("message", aoReceberMensagem);
  }, []);

  const conectar = useCallback(() => {
    if (!window.FB) return;
    setErro(null);
    setConectando(true);

    window.FB.login(
      async (resposta) => {
        const code = resposta.authResponse?.code;
        const { waba_id, phone_number_id } = sessao.current;

        if (!code || !waba_id || !phone_number_id) {
          setErro(
            code
              ? "A Meta não devolveu os dados do número. Tente novamente."
              : "Conexão cancelada."
          );
          setConectando(false);
          return;
        }

        const res = await fetch("/api/whatsapp/conectar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, waba_id, phone_number_id }),
        });

        if (!res.ok) {
          const corpo = await res.json().catch(() => null);
          setErro(corpo?.erro ?? "Não foi possível concluir a conexão.");
          setConectando(false);
          return;
        }

        router.refresh();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: "3" },
      }
    );
  }, [configId, router]);

  return (
    <div className="space-y-3">
      <Button onClick={conectar} disabled={!pronto || conectando} tamanho="lg">
        <MessageCircle className="size-5" />
        {conectando ? "Conectando…" : "Conectar WhatsApp"}
      </Button>
      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}
      {!pronto && (
        <p className="text-xs text-ink-muted">Carregando o conector da Meta…</p>
      )}
    </div>
  );
}
