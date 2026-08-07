# Continuando o VetHub em outro computador

Roteiro para deixar a máquina nova rodando igual à antiga.

## Antes de tudo: o que NÃO vai pelo git

Duas coisas ficam fora do repositório de propósito e você precisa levar à mão:

1. **O histórico da conversa com o Claude Code.** Ele fica salvo na sua
   máquina, fora da pasta do projeto. Trocar de PC começa uma conversa nova.
   O que sobrevive é o que está escrito no repositório — por isso este
   arquivo e o [testes-de-navegador.md](testes-de-navegador.md) existem.

2. **As chaves (`.env.local`).** Nunca vão para o git, e é assim que tem que
   ser: quem tem a `SUPABASE_SERVICE_ROLE_KEY` manda no banco inteiro,
   passando por cima de qualquer regra de isolamento entre clínicas. O passo
   3 abaixo mostra como recuperá-las sem copiar arquivo por e-mail.

## 1. Trazer o projeto

```bash
git clone https://github.com/contatoenderecodigital-sudo/vethub.git
cd vethub
npm install
```

> **Copiar a pasta de documentos não é trazer o projeto.** O zip de `.md`
> gerado para envio contém só a documentação, achatada numa pasta só — sem
> `src/`, sem `supabase/`, sem `.git`. Quem copia esse zip para a máquina nova
> fica com 19 arquivos de texto e nenhum sistema. O código vem do clone acima,
> sempre. Para conferir que veio inteiro: `git ls-files | wc -l` tem que
> passar de 300.

## 2. Instalar o navegador dos testes

Só é preciso se você for rodar os testes de tela (veja
[testes-de-navegador.md](testes-de-navegador.md)):

```bash
npx playwright install chromium
```

## 3. Recuperar as chaves

> **Puxar da Vercel NÃO traz as chaves.** Elas estão marcadas como
> **Sensitive** lá, e isso é *write-only* por design: nem o painel nem o CLI
> conseguem ler o valor de volta. O `vercel env pull` baixa um arquivo com a
> palavra `encrypted` no lugar de cada valor, e o erro que aparece depois é um
> confuso `Invalid supabaseUrl`. Vale a pena rodar mesmo assim, porque traz o
> `VERCEL_OIDC_TOKEN`, mas as chaves vêm do Supabase.

Copie `.env.example` para `.env.local` e preencha:

| Variável | Onde pegar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → chave *anon* |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → chave *service_role* |
| `SUPABASE_DB_URL` | Supabase → Settings → Database → *Connection string* → **Session mode (porta 5432)** |
| `CRON_SECRET` | qualquer texto longo; só precisa ser igual ao da Vercel |

As duas primeiras são **públicas por design** — vão no JavaScript entregue ao
navegador de qualquer visitante. As outras três não: quem tem a
`service_role` manda no banco inteiro, passando por cima do isolamento entre
clínicas.

Se quiser conferir que nada secreto vazou para o navegador, é o que o
`backend.mjs` faz (veja [testes-de-navegador.md](testes-de-navegador.md)).

Ainda assim vale linkar o projeto, para os comandos da Vercel funcionarem:

```bash
npm i -g vercel     # se ainda não tiver
vercel login        # abre o navegador com um código de dispositivo
vercel link --yes --project vethub
```

> **Atenção no PowerShell:** não use `|` (pipe) para mandar valor para
> `vercel env add` — o PowerShell grava um `\r` invisível junto e a chave
> chega quebrada no servidor, com erro difícil de achar. Use `vercel env
> pull` como acima, ou digite o valor quando ele perguntar.

## 4. Rodar

```bash
npm run dev     # http://localhost:3000
```

Antes de qualquer deploy, o teste de isolamento entre clínicas é obrigatório:

```bash
npm test
```

## 5. Publicar

O deploy é automático: todo push na branch `main` faz a Vercel construir e
publicar em https://vethub-tau.vercel.app.

```bash
git add -A
git commit -m "sua mensagem"
git push origin main
```

## Onde as coisas moram

| O quê | Onde |
| --- | --- |
| Telas do sistema | `src/app/(app)/` |
| Peças reutilizáveis (botão, campo, tabela…) | `src/components/ui/` |
| Quadros que se arrastam (kanban) | `src/components/quadro.tsx` |
| O guia do Bento e os textos dele | `src/components/guia/` |
| Arte do Bento | `public/capivara/` |
| Migrações do banco | `supabase/migrations/` |
| Testes de navegador | `tests/varredura/` |
| Região do servidor (São Paulo) | `vercel.json` |

## Detalhes da infraestrutura

- **Vercel** roda em `gru1` (São Paulo) e o **Supabase** em `sa-east-1`
  (São Paulo). Os dois já estão do lado um do outro; não há ganho de
  velocidade em mudar região.
- **Migrações** usam o pooler em Session mode (porta 5432); o app em
  produção usa Transaction mode (porta 6543).
