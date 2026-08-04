# VetHub

Sistema de gestão para clínicas veterinárias, hospitais veterinários e petshops.
**A central que junta agenda, prontuário, internação e estoque em um só lugar.**

SaaS multi-tenant: cada clínica é um tenant, isolado no banco via Row Level Security (RLS) do Supabase.

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** v4
- **Supabase** (Postgres + Auth + Storage), isolamento por RLS
- **Vercel** (deploy)
- Fase 2: n8n + WhatsApp

## Rodando localmente

1. **Instale as dependências**

   ```bash
   npm install
   ```

2. **Configure o ambiente**

   Copie `.env.example` para `.env.local` e preencha com os valores do painel
   do Supabase (Settings → API). A chave `service_role` fica **somente** no
   servidor — nunca é exposta ao navegador.

3. **Aplique as migrações**

   ```bash
   npx supabase db push --db-url "SUA_STRING_DO_POOLER_SESSION_MODE"
   ```

   Use a string do pooler em **Session mode (porta 5432)** para migrações.
   O app em produção usa o pooler em **Transaction mode (porta 6543)**.

4. **Rode o teste de isolamento de tenant** (obrigatório antes de qualquer deploy)

   ```bash
   npm test
   ```

   O teste cria duas clínicas e confirma que uma nunca enxerga os dados da outra.

5. **Suba o servidor**

   ```bash
   npm run dev
   ```

   Acesse http://localhost:3000, crie sua clínica em **/cadastro** e pronto.

## Estrutura

```
supabase/migrations/   migrações versionadas (schema, RLS, storage)
tests/                 teste de isolamento de tenant
src/
  proxy.ts             proteção de rotas + renovação de sessão
  lib/supabase/        clients (browser, server, admin)
  lib/                 auth, types, formatadores
  components/          kit de UI (marca VetHub) + navegação
  app/
    login, cadastro    autenticação
    api/               route handlers (cadastro, buscas)
    (app)/             área logada: dashboard, agenda, tutores,
                       pets, consultas, orçamentos, equipe
```

## Papéis

- **admin** — dono da clínica: tudo + gestão de equipe
- **veterinario** — atende, escreve prontuário, monta orçamento
- **recepcao** — agenda, check-in/out, cadastra tutor e pet

## Segurança

- RLS ativo em todas as tabelas; policies usam `clinica_do_usuario()` em subselect.
- Teste automatizado de isolamento entre clínicas (`tests/tenant-isolation.test.ts`).
- `service_role` só em route handlers/server actions; o front usa apenas a chave `anon`.
- Senha forte obrigatória; consentimento LGPD registrado no cadastro do tutor.

## Fases

- **Fase 1 (este MVP):** auth multi-tenant, tutores, pets, agenda com
  check-in/check-out, prontuário com anexos, orçamentos, equipe.
- **Fase 2:** automação WhatsApp (confirmação, lembretes, chatbot) + PWA.
- **Fase 3:** internação, estoque, PDV, banho e tosa, financeiro.
