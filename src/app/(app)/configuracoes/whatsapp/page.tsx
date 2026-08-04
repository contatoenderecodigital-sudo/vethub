import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  CircleAlert,
  CircleCheck,
  MessageCircle,
  Phone,
  ShieldCheck,
  Syringe,
  Unplug,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { metaConfigurada, type ConexaoWhatsapp } from "@/lib/whatsapp";
import { formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitulo } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ConectarWhatsapp } from "./conectar-whatsapp";
import { desconectarWhatsapp } from "./actions";

export const metadata = { title: "WhatsApp" };

export default async function WhatsappPage() {
  const { usuario } = await getSessao();
  if (usuario.papel !== "admin") redirect("/dashboard");

  // Token fica em tabela sem policies — leitura só aqui, com service_role,
  // depois da checagem de admin acima (e sem nunca enviar o token à tela).
  const admin = createAdminClient();
  const { data: conexao } = await admin
    .from("whatsapp_conexao")
    .select(
      "id, clinica_id, waba_id, phone_number_id, numero_exibicao, nome_verificado, status, conectado_em"
    )
    .eq("clinica_id", usuario.clinica_id)
    .maybeSingle<ConexaoWhatsapp>();

  const configurada = metaConfigurada();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="WhatsApp"
        subtitulo="Conecte o número da clínica à plataforma oficial do WhatsApp Business"
      />

      {/* O que a clínica ganha */}
      <Card className="mb-4">
        <CardTitulo>O que a conexão libera</CardTitulo>
        <ul className="grid gap-3 text-sm text-ink-muted sm:grid-cols-3">
          <li className="flex items-start gap-2">
            <CalendarCheck className="mt-0.5 size-4 shrink-0 text-brand" />
            Confirmação automática de agendamento direto no WhatsApp do tutor
          </li>
          <li className="flex items-start gap-2">
            <Syringe className="mt-0.5 size-4 shrink-0 text-brand" />
            Lembrete de vacina e de retorno na data certa
          </li>
          <li className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand" />
            Chatbot que agenda sozinho, sem ocupar a recepção
          </li>
        </ul>
      </Card>

      {conexao && conexao.status !== "desconectado" ? (
        /* ---------------- Conectado ---------------- */
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <CardTitulo className="mb-0">Conexão ativa</CardTitulo>
            {conexao.status === "conectado" ? (
              <Badge tom="success">Conectado</Badge>
            ) : (
              <Badge tom="danger">Erro na conexão</Badge>
            )}
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-ink-muted">
                <Phone className="size-4" />
                Número
              </dt>
              <dd className="font-medium text-ink">
                {conexao.numero_exibicao ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-ink-muted">
                <BadgeCheck className="size-4" />
                Nome verificado
              </dt>
              <dd className="font-medium text-ink">
                {conexao.nome_verificado ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Conta WhatsApp Business (WABA)</dt>
              <dd className="font-mono text-xs text-ink">{conexao.waba_id}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Conectado em</dt>
              <dd className="font-medium text-ink">
                {formatDataHora(conexao.conectado_em)}
              </dd>
            </div>
          </dl>

          {conexao.status === "erro" && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              A conexão foi salva, mas a inscrição nos eventos falhou.
              Desconecte e conecte de novo.
            </p>
          )}

          <div className="mt-6 border-t border-edge pt-4">
            <form action={desconectarWhatsapp}>
              <ConfirmButton
                variante="secondary"
                mensagem="Desconectar o WhatsApp interrompe confirmações, lembretes e chatbot. Tem certeza?"
              >
                <Unplug className="size-4" />
                Desconectar
              </ConfirmButton>
            </form>
          </div>
        </Card>
      ) : configurada ? (
        /* ---------------- Pronto para conectar ---------------- */
        <>
          <Card className="mb-4">
            <CardTitulo>Antes de conectar, tenha em mãos</CardTitulo>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-muted">
              <li>
                <span className="font-medium text-ink">Conta no Facebook</span>{" "}
                com acesso ao negócio da clínica (ou disposição para criar o
                Portfólio Empresarial durante o processo — o próprio fluxo guia).
              </li>
              <li>
                <span className="font-medium text-ink">
                  Um número de telefone exclusivo
                </span>{" "}
                para o WhatsApp da clínica. Importante: o número{" "}
                <span className="font-medium text-ink">
                  não pode estar em uso no aplicativo comum do WhatsApp
                </span>{" "}
                (nem no WhatsApp Business de celular). Se estiver, exclua a conta
                no app antes.
              </li>
              <li>
                O número precisa{" "}
                <span className="font-medium text-ink">receber SMS ou ligação</span>{" "}
                para o código de verificação.
              </li>
            </ol>
          </Card>

          <Card className="mb-4">
            <CardTitulo>Como funciona (leva ~3 minutos)</CardTitulo>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-muted">
              <li>
                Clique em <span className="font-medium text-ink">Conectar WhatsApp</span>.
                Uma janela segura da própria Meta se abre.
              </li>
              <li>Entre com o Facebook e escolha (ou crie) o negócio da clínica.</li>
              <li>Informe o número e confirme o código recebido por SMS/ligação.</li>
              <li>
                Pronto — a janela fecha e o número aparece aqui como{" "}
                <span className="font-medium text-ink">Conectado</span>.
              </li>
            </ol>

            <div className="mt-5">
              <ConectarWhatsapp
                appId={process.env.NEXT_PUBLIC_META_APP_ID!}
                configId={process.env.NEXT_PUBLIC_META_ES_CONFIG_ID!}
              />
            </div>
          </Card>

          <Card>
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              A conexão usa o fluxo oficial da Meta (Embedded Signup). O VetHub
              nunca vê sua senha do Facebook, e as credenciais de acesso ficam
              guardadas apenas no servidor, jamais no navegador. Ao conectar, o
              envio de mensagens segue as políticas do WhatsApp Business — os
              tutores precisam ter aceitado receber mensagens da clínica.
            </p>
          </Card>
        </>
      ) : (
        /* ---------------- App Meta ainda não configurado ---------------- */
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <CircleCheck className="size-5 text-pending" />
            <CardTitulo className="mb-0">Integração em preparação</CardTitulo>
          </div>
          <p className="text-sm text-ink-muted">
            A conexão oficial com o WhatsApp (Meta) está em fase final de
            homologação. Assim que o app for aprovado na análise da Meta, o
            botão de conexão aparece aqui e todo o processo leva cerca de 3
            minutos — sem instalação, direto pelo navegador.
          </p>
        </Card>
      )}
    </div>
  );
}
