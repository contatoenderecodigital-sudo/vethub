# Testes de navegador

Quatro roteiros que abrem o sistema num navegador de verdade (Playwright),
clicam nas coisas e medem. Servem para achar o que só aparece rodando: erro
de console, requisição falhada, layout estourado, botão que não funciona e
tela lenta.

## Preparo

```bash
npx playwright install chromium     # uma vez por máquina
```

Todos aceitam as mesmas variáveis:

| Variável | Para que serve |
| --- | --- |
| `VETHUB_EMAIL` / `VETHUB_SENHA` | login usado pelo robô (obrigatório) |
| `BASE_URL` | onde testar. Padrão: `http://localhost:3000` (o de velocidade usa produção) |

O que os roteiros geram fica em `tests/varredura/resultado*/` e **não vai
para o git** — é resultado, se refaz rodando de novo.

## `varredura.mjs` — as telas

```bash
VETHUB_EMAIL=... VETHUB_SENHA=... node tests/varredura/varredura.mjs
```

Abre as 76 páginas do sistema em tela de computador (1440px) **e** de celular
(390px), tira print de cada uma e anota: erro de JavaScript, requisição que
falhou, HTTP 500, imagem quebrada, faixa de erro na tela, rolagem lateral
indevida e elemento passando da borda.

Ele descobre as rotas lendo a pasta `src/app`, então a lista nunca envelhece.
Páginas de detalhe (`/tutores/<id>`) ele acha sozinho pelos links das listas.

Saída: `tests/varredura/resultado/relatorio.md` + os prints.

## `cadastros.mjs` — criar, editar e apagar

```bash
VETHUB_EMAIL=... VETHUB_SENHA=... node tests/varredura/cadastros.mjs
```

Para tutor, fornecedor e produto: tenta salvar o formulário vazio (a
validação tem que segurar), cria, confere na lista, edita, confere de novo,
apaga e confere que sumiu.

Tudo que ele cria começa com **`ZZ Robo`** e é apagado no fim — inclusive
sobras de execuções anteriores que morreram no meio.

Saída: `tests/varredura/resultado-cadastros/relatorio.md`.

## `backend.mjs` — segurança

```bash
VETHUB_EMAIL=... VETHUB_SENHA=... node tests/varredura/backend.mjs
```

Confere o que não dá para ver na tela:

- as rotas de `/api` respondem para quem não está logado?
- o banco entrega alguma linha para anônimo? (RLS, 16 tabelas)
- logado, o usuário alcança dados de OUTRA clínica? Consegue **gravar** lá?
- a `SUPABASE_SERVICE_ROLE_KEY` aparece em algum arquivo entregue ao
  navegador?

Saída: `tests/varredura/resultado-backend/relatorio.md`.

## `velocidade.mjs` — cronômetro

```bash
VETHUB_EMAIL=... VETHUB_SENHA=... node tests/varredura/velocidade.mjs
```

Mede três coisas separadas, porque doem em lugares diferentes:

1. **abrir a página direto** (recarregar) — quanto o servidor leva;
2. **trocar de aba pelo menu** — o que o usuário faz o dia inteiro;
3. **criar, editar e apagar** — do clique em Salvar até a tela seguinte.

Roda contra **produção** por padrão: no servidor de desenvolvimento os
números mentem, porque ele compila cada página na hora. Para comparar com a
máquina local, passe `BASE_URL=http://localhost:3000`.

Régua usada: até 500 ms excelente · até 1 s bom · até 2 s aceitável ·
até 4 s lento.

Saída: `tests/varredura/resultado-velocidade/relatorio.md`.

## Coisas que estes testes já pegaram

Ficam registradas aqui para não voltarem sem ninguém notar:

- **Excluir não funcionava em 7 telas** (as que usam o menu `⋯`). No React o
  evento de um portal sobe pela árvore de *componentes*, não pela do DOM: o
  clique na janela de confirmação chegava ao menu, que fechava e desmontava
  o botão antes do envio. Corrigido em `menu-acoes.tsx` e
  `confirm-button.tsx`.
- **Erro de hidratação em toda página** para quem tinha escolhido uma cor de
  tema — o script que aplica o tema mexe no `<html>` antes do React hidratar.
  Resolvido com `suppressHydrationWarning` no `<html>`.
- **Trocar de aba levava ~550 ms** porque o Next só adianta o esqueleto das
  páginas dinâmicas. As cinco telas do dia a dia agora pedem `prefetch`
  completo (veja `quente` em `nav-links.tsx`) e caíram para ~130 ms.
