# Custo do WhatsApp oficial (Meta): base para precificação

Dados extraídos dos **rate cards oficiais da Meta** (CSVs publicados em
developers.facebook.com), vigentes desde **1º de julho de 2026**.
Última verificação: 04/08/2026.

## Preço por mensagem: Brasil (+55)

| Categoria | USD | BRL | Quando usamos |
|---|---|---|---|
| **Utility** | 0,0068 | **R$ 0,0350** | Confirmação de agendamento, lembrete de vacina/retorno, aviso de resultado |
| **Authentication** | 0,0068 | R$ 0,0350 | Códigos de verificação (não usamos hoje) |
| **Marketing** | 0,0625 | **R$ 0,3217** | Campanhas, promoções (só se a clínica quiser) |
| **Service** | grátis | grátis | Respostas dentro da janela de 24h (chatbot), **muda em out/2026, ver abaixo** |

A Meta **não cobra taxa fixa nem por número de telefone**. O modelo é 100%
por mensagem. O acesso à Cloud API é gratuito. (BSPs como Twilio/360dialog
cobram markup próprio; por isso vamos direto na Cloud API.)

Volume tiers (descontos de 5% a 25%) só começam acima de 250 mil mensagens/mês
de utility, irrelevante para nós no início: **pagamos sempre a tarifa cheia**.

## Faturamento em reais

Desde **16/07/2026** dá para criar a conta WhatsApp Business (WABA) faturada em
**BRL pela Facebook Brasil**, sem exposição a câmbio. Contas em outra moeda
precisam migrar até **30/06/2027**.

## Alertas de mudança (importante para a margem)

- **01/08/2026**: Meta passa a cobrar o *Business Agent* (IA da própria Meta)
  por token: USD 2,00 por 1 milhão de tokens (~4-5 centavos de dólar por
  mensagem). **Não usamos esse recurso**: nosso chatbot roda por nossa conta.
- **01/10/2026**: Meta começa a cobrar **mensagens de atendimento (service)**,
  hoje gratuitas, à mesma tarifa de utility (≈ R$ 0,035). Também passa a cobrar
  templates de utility enviados dentro da janela de 24h.
  **As tarifas exatas de outubro devem ser anunciadas até 01/09/2026**. Revisar
  este documento nessa data.
- A "franquia de 1.000 conversas grátis por mês" **não existe mais** desde que a
  Meta migrou para cobrança por mensagem (jul/2025). Não prometer isso a cliente.

## Estimativa de custo por clínica (para precificar)

Cenário conservador de uma clínica pequena/média:

| Uso mensal | Mensagens | Custo Meta |
|---|---|---|
| 200 agendamentos × 2 avisos (confirmação + lembrete) | 400 utility | R$ 14,00 |
| 100 lembretes de vacina/retorno | 100 utility | R$ 3,50 |
| Conversas do chatbot (service, hoje grátis) | ~600 | R$ 0,00 (R$ 21,00 após out/2026) |
| **Total hoje** | | **≈ R$ 17,50/mês** |
| **Total após out/2026** | | **≈ R$ 38,50/mês** |

Ou seja: mesmo no cenário pós-outubro, o custo de WhatsApp por clínica fica
abaixo de R$ 40/mês. Numa mensalidade de R$ 200–400, isso é **10-20% de custo
variável**: precisa estar embutido no preço, com franquia de mensagens por
plano e cobrança de excedente para quem dispara muito marketing.

**Regra de negócio sugerida:** incluir uma franquia de mensagens de utility no
plano (ex.: 500/mês no plano intermediário) e repassar o excedente com margem.
Mensagens de marketing (R$ 0,32 cada, quase 10× mais caras) devem ser sempre
cobradas à parte ou desabilitadas por padrão.

## Fontes

- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing (rate cards CSV, incl. BRL)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages (mudanças de ago/out 2026)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/change-billing-currency (migração para BRL)
