import { NextResponse, type NextRequest } from "next/server";

/**
 * Webhook da WhatsApp Cloud API.
 *
 * GET  → verificação do endpoint pela Meta (hub.challenge).
 * POST → eventos de mensagens/status. Na Fase 2 os eventos alimentam a
 *        automação (n8n): confirmação de agendamento, lembretes e chatbot.
 *        Por enquanto o endpoint aceita e confirma (200) — obrigatório
 *        para a análise do app e para a Meta não desativar o webhook.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const modo = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (modo === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ erro: "Token de verificação inválido." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  // A Meta exige resposta 200 rápida; processamento pesado vai para fila (Fase 2).
  try {
    await request.json(); // consome o corpo
  } catch {
    // corpo inválido — ainda assim confirmamos para não acumular retries
  }
  return NextResponse.json({ ok: true });
}
