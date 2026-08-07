# Testes de navegador

Sete roteiros que abrem o sistema num navegador de verdade (Playwright),
clicam nas coisas e medem — mais um que fala direto com o banco. Servem para
achar o que só aparece rodando: erro de console, requisição falhada, layout
estourado, botão que não funciona, tela lenta, texto ilegível e conta que não
fecha.

| Roteiro | Responde |
| --- | --- |
| `varredura.mjs` | as telas quebram? |
| `cadastros.mjs` | dá para criar, editar e apagar? |
| `dinheiro.mjs` | as contas fecham no mesmo centavo? |
| `fluxos.mjs` | os fluxos clínicos vão do começo ao fim? |
| `design.mjs` | dá para ler, tocar e navegar de teclado? |
| `backend.mjs` | uma clínica enxerga a outra? |
| `velocidade.mjs` | quanto tempo leva? |
| `conferir-banco.mjs` | o que está gravado de verdade? |

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

## `dinheiro.mjs` — as contas fecham?

```bash
BASE_URL=https://vethub-tau.vercel.app node tests/varredura/dinheiro.mjs
```

O teste que o `relatorio-correcoes.md` chamava de "o que mais interessa".
Vende três vezes o mesmo produto de R$ 100 para o mesmo tutor:

| Venda | Pagamento |
| --- | --- |
| A | R$ 100 em dinheiro (à vista) |
| B | R$ 100 fiado |
| C | R$ 40 em dinheiro + R$ 60 fiado |

Se o livro for único, só existe um resultado possível: **vendido R$ 300**,
**entrou R$ 140**, **em aberto R$ 160**. Ele então confere se a ficha do
tutor, `/financeiro/receber` e o painel financeiro (nos dois regimes) contam
essa mesma história.

Duas coisas que ele faz de propósito:

- **Cria a própria clínica** pelo cadastro público a cada execução. O teste
  compara totais absolutos, então precisa de uma clínica virgem: rodando duas
  vezes na mesma, as contas da primeira rodada entrariam na conta da segunda.
  Não precisa de `VETHUB_EMAIL` nem `VETHUB_SENHA`.
- **Desliga a abertura automática do guia** (`vethub:guia:automatico` no
  localStorage) antes de qualquer script da página rodar.

## `fluxos.mjs` — o que a clínica faz o dia inteiro

```bash
BASE_URL=https://vethub-tau.vercel.app node tests/varredura/fluxos.mjs
```

Percorre sete fluxos de ponta a ponta, cada um isolado (o que quebrar não
derruba os outros):

| Fluxo | O que exercita |
| --- | --- |
| agenda | criar agendamento e conferir se aparece nas 4 visões; mudar status |
| consulta | registrar prontuário e conferir no histórico do pet |
| receita | emitir com medicamento e posologia, e abrir a via de impressão |
| internação | internar, registrar evolução com sinais vitais, prescrever |
| orçamento | criar, aprovar e usar o **Cobrar no PDV** com o carrinho montado |
| compra e estoque | comprar com frete e 2 parcelas, **receber a mercadoria**, conferir estoque e contas a pagar |
| relatórios | abrir os 8 relatórios sem tela de erro |

Cria a própria clínica virgem e escreve no relatório o e-mail **e a senha**
dela: quando um número não bater, dá para entrar e olhar com os próprios olhos.

> **Compra pendente não é compra recebida.** Lançar a nota cria a compra com
> status `pendente` e mais nada. Estoque, custo do produto e contas a pagar só
> nascem no **Receber mercadoria** — que é o certo, porque a nota chega antes
> da mercadoria ser conferida. Um teste que pare no lançamento vai acusar
> "compra não virou conta a pagar" e estará errado.

## `design.mjs` — está usável?

```bash
BASE_URL=http://localhost:3000 node --env-file=.env.local tests/varredura/design.mjs
```

Abre todas as rotas em **três larguras** (390, 768 e 1440 px) e nos **dois
modos**, e mede o que a varredura não vê: contraste contra a norma WCAG AA,
alvo de toque, campo sem etiqueta, botão de ícone sem nome, foco invisível,
emoji na interface, texto em inglês e rolagem lateral.

Duas armadilhas que custaram caro e estão resolvidas no código — não as
reintroduza ao mexer:

1. **Contraste precisa enxergar degradê.** O fundo do app e o cabeçalho são
   `linear-gradient`, que é `background-image`, não `background-color`. Um
   medidor que só lê `backgroundColor` acha que o fundo é branco e reprova o
   texto branco do cabeçalho com 1.10:1 — foram 5.524 falsos positivos numa
   primeira versão. O fundo da página inteira ainda mora num `::before` do
   `body`, que também precisa ser lido.
2. **A régua de toque da norma AA é 24 px, não 44.** 44×44 é AAA/Apple. Medir
   tudo contra 44 gera milhares de "falhas" que norma nenhuma cobra. O
   relatório separa: abaixo de 24 **reprova**; entre 24 e 44 é só aperto.

3. **Caixa de seleção dentro de `<label>` tem o RÓTULO como alvo**, não o
   quadradinho: clicar no texto marca a caixa. Medir só o `input` acusa
   dezenas de alvos pequenos que o dedo acerta sem esforço.

## A armadilha do modo claro

O modo claro é um bloco de CSS que reescreve as classes **pelo nome**
(`.bg-white/15`, `.text-emerald-50`, …). Isso é o que permitiu implementá-lo
sem tocar em 103 arquivos, mas cobra um preço: **a lista envelhece calada**.

Três coisas já escaparam por aí:

- `hover:bg-white/20` gera um seletor DIFERENTE de `bg-white/20`, e nenhuma
  regra o alcançava: o hover simplesmente não existia no modo claro;
- as variantes `sm:` também geram outra classe (`sm:bg-white/15`), e o
  alternador da agenda ficou de fora da correção de contraste;
- `text-cyan-50` e `bg-emerald-300/25` nunca entraram na lista, e as
  etiquetas que os usam ficavam em 1.09:1 — texto quase branco sobre papel
  branco.

Ao criar um tom novo de etiqueta, ou usar um véu com prefixo de tela, procure
a classe no `globals.css` e acrescente a conversão. A `design.mjs` pega o
esquecimento, mas só quando alguém a roda.

## `conferir-banco.mjs` — o árbitro

```bash
node --env-file=.env.local tests/varredura/conferir-banco.mjs
```

Não abre navegador: entra no banco com a chave `anon` e um login normal —
portanto **com RLS ligado**, enxergando só o que aquele usuário enxergaria — e
imprime vendas, contas, baixas e os totais.

Serve para desempatar quando uma tela mostra número estranho: se o banco e a
tela discordam, o defeito é da tela; se o banco já está errado, o defeito é de
quem gravou. Foi ele que provou que o livro único funcionava enquanto o painel
ainda mostrava R$ 0,00.

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
- **O painel financeiro mostrava R$ 0,00 num dia de R$ 300 vendidos.** Os
  cartões contavam por *vencimento*, e todo fiado nasce vencendo em 30 dias:
  a venda de hoje caía no mês seguinte e sumia da tela do mês. Os cartões
  passaram a seguir o alternador Caixa/Competência (que subiu para o topo,
  perto deles) e o "em aberto" deixou de ser recortado por mês. O mesmo
  recorte existia no dashboard.
- **O guia do Bento engolia o primeiro clique de cada página nova.** Ele abre
  sozinho 700 ms depois de carregar, e o fundo dele cobria a tela inteira
  segurando o clique — quem mirava em Salvar fechava a capivara. O fundo virou
  `pointer-events-none` e quem fecha o guia é um ouvinte de `pointerdown` que
  não impede o clique de chegar ao destino.

## Uma armadilha ao testar

Duas coisas atrapalham qualquer robô neste sistema, e valem para quem escrever
o próximo roteiro:

1. **O guia abre sozinho.** Sempre desligue antes de navegar:
   `contexto.addInitScript(() => localStorage.setItem("vethub:guia:automatico", "1"))`.
2. **`main a[href^="/tutores/"]` pega o botão "Novo tutor"**, que vem antes da
   ficha na página. Use `:not([href$="/novo"])`, ou o robô abre um formulário
   em branco achando que é o cadastro que procurava.
