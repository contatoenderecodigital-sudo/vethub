# O que depende de você

Tudo que **eu não consigo fazer sozinho** porque exige uma conta, um
documento ou um cartão no seu nome. Atualizado em 04/08/2026.

Ordem sugerida: comece pela **1** (é a que demora dias por conta de terceiros),
o resto pode ser feito em qualquer ordem.

---

## 1. Meta / WhatsApp: comece por aqui, demora dias

Sem isso não existem **mensagens automáticas** nem **chatbot**, que são o
principal diferencial de venda do VetHub.

- [ ] **1.1** Criar o Portfólio Empresarial em https://business.facebook.com
- [ ] **1.2** Fazer a **verificação da empresa** (Configurações do negócio →
      Central de segurança → Iniciar verificação). Precisa de CNPJ e
      documento da empresa. **É o passo lento: pode levar dias.**
- [ ] **1.3** Em https://developers.facebook.com criar um app do tipo
      **Empresa/Business** e vinculá-lo ao portfólio
- [ ] **1.4** No app, adicionar o produto **WhatsApp**
- [ ] **1.5** Em *Facebook Login for Business → Configurações*, criar uma
      configuração de **Embedded Signup** (ela gera um `config_id`)
- [ ] **1.6** Em *WhatsApp → Configuração → Webhook*, preencher:
      - URL de callback: `https://vethub-tau.vercel.app/api/whatsapp/webhook`
      - Token de verificação: `rnwik4yfh60umdscap9t35zv7l8b2q1xgoej`
      - Clicar em **Verificar e salvar** e assinar o campo **messages**
- [ ] **1.7** Em *Configurações do app → Básico*, preencher ícone e as URLs:
      - Política de Privacidade: `https://vethub-tau.vercel.app/politica-de-privacidade`
      - Termos: `https://vethub-tau.vercel.app/termos-de-uso`
      - Exclusão de dados: `https://vethub-tau.vercel.app/exclusao-de-dados`
- [ ] **1.8** **Me mandar 3 valores**: `App ID`, `App Secret` e o `config_id`
- [ ] **1.9** Submeter o app à análise pedindo as permissões
      `whatsapp_business_management` e `whatsapp_business_messaging`

> Dá para **testar antes da aprovação**: em modo desenvolvimento o Embedded
> Signup funciona com números de teste. A análise só é necessária para
> clínicas de fora usarem.

---

## 2. Chave de IA: para o Bento (nosso assistente)

O Bento (a capivara veterinária) vai transcrever consulta, resumir prontuário
e analisar histórico, igual à "Nina" do concorrente, e melhor.

- [ ] **2.1** Criar conta em https://console.anthropic.com (recomendado) ou
      https://platform.openai.com
- [ ] **2.2** Colocar um cartão e adicionar crédito (US$ 20 já dá para muito teste)
- [ ] **2.3** Gerar uma **API key** e me mandar

**Custo real por consulta transcrita:** R$ 0,26 a R$ 1,30 (a maior parte é a
transcrição do áudio, não o texto). Numa mensalidade de R$ 329 com cota de
60 consultas, isso é ~R$ 40 de custo. Cabe folgado.

---

## 3. Vercel: variáveis que faltam

Depois que você me passar os itens 1 e 2, **eu configuro sozinho**. Estas já
estão lá e funcionando:

| Variável | Situação |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | configurada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | configurada |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | configurada |
| `NEXT_PUBLIC_META_APP_ID` | **falta** (item 1.8) |
| `NEXT_PUBLIC_META_ES_CONFIG_ID` | **falta** (item 1.8) |
| `META_APP_SECRET` | **falta** (item 1.8) |
| `ANTHROPIC_API_KEY` | **falta** (item 2.3) |

---

## 4. Supabase: não precisa fazer nada

Todas as migrações (10 até agora) já foram aplicadas por mim no banco. Você
**não precisa criar coluna nem tabela manualmente**, nunca precisará, é sempre
por migração versionada.

Duas coisas que valem a pena ligar quando começar a ter cliente de verdade:

- [ ] **4.1** No painel do Supabase → *Database → Backups*: conferir que o
      backup automático diário está ativo (no plano gratuito é 7 dias; o Pro
      guarda mais e permite restaurar no ponto exato)
- [ ] **4.2** Quando passar de umas 20 clínicas, subir do plano gratuito para
      o **Pro (US$ 25/mês)**. O gratuito pausa o projeto se ficar uma semana
      sem acesso, e isso não pode acontecer com cliente pagando

---

## 5. Antes de vender para a primeira clínica

- [ ] **5.1** Registrar um domínio (ex.: `vethub.com.br` no registro.br,
      ~R$ 40/ano) e me avisar: eu plugo na Vercel em minutos
- [ ] **5.2** Definir os preços finais (minha proposta está em
      `docs/concorrentes/mercado.md`: R$ 149 / R$ 329 / R$ 699)
- [ ] **5.3** Trocar o e-mail de contato nas páginas legais, se quiser um
      institucional em vez do pessoal (hoje: `yungsandro23@gmail.com`)
- [ ] **5.4** Decidir o meio de cobrança da assinatura do VetHub
      (Stripe, Asaas, Pagar.me...). Quando decidir, eu integro
- [ ] **5.5** Rodar o teste de isolamento uma última vez (`npm test`) e
      fazer um teste completo com dados reais

---

## 6. Módulo Fiscal: decisão sua

Ver `docs/fiscal.md` para a análise completa das opções.

---

## O que NÃO precisa fazer

- Criar tabela ou coluna no Supabase (é tudo migração)
- Configurar deploy (push na main já publica)
- Mexer em variável de ambiente (me passa o valor que eu configuro)
- Fazer backup manual do código (está no GitHub)
