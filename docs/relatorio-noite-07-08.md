# O que foi feito na noite de 06 para 07/08/2026

Relatório de uma sessão longa, escrito para ser lido de manhã. Começou com a
troca de computador e terminou com o design refeito onde ele não deixava ler.

Tudo abaixo está **publicado em produção**.

---

## 1. A máquina nova não tinha o projeto

A pasta continha 19 arquivos `.md` e nada mais: era o zip de documentação,
achatado, sem `src/`, sem `supabase/`, sem `.git`. O código veio do clone do
GitHub. Conferi antes que não houvesse nada não commitado ali — os 19 arquivos
eram cópias idênticas do que já estava versionado.

Duas coisas da documentação estavam erradas e foram corrigidas:

- **`vercel env pull` não traz as chaves.** Elas são *Sensitive* na Vercel, que
  é write-only por design: o pull baixa a palavra `encrypted` no lugar de cada
  valor, e o erro que aparece depois é um confuso `Invalid supabaseUrl`. As
  chaves vêm do painel do Supabase.
- **Copiar o zip de documentos não é trazer o projeto.** Ficou registrado no
  `TROCANDO-DE-PC.md`, com o comando que confirma que o clone veio inteiro.

O `.env.local` também levava 21 variáveis de build injetadas pela Vercel
(`VERCEL_*`, `TURBO_*`). A pior era `VERCEL_ENV=production`, que faz o código
local achar que está em produção. Removidas.

---

## 2. O dinheiro: o painel mentia por omissão

**O painel financeiro e o dashboard mostravam R$ 0,00 num dia de R$ 300
vendidos.** Os cartões contavam por *vencimento*, e todo fiado nasce vencendo
em 30 dias: a venda de hoje caía no mês seguinte e sumia da tela do mês.

Os cartões passaram a seguir o alternador **Caixa / Competência** que já
existia no gráfico, e o alternador subiu para o topo, junto deles — escondido
lá embaixo, o dono trocava de regime sem perceber que os números de cima
mudavam junto.

| | Caixa | Competência |
| --- | --- | --- |
| Entrada do mês | Recebido | Vendido |
| Saída do mês | Pago | Comprado |
| Terceiro cartão | Saldo | Resultado |

O "a receber em aberto" deixou de ser recortado pelo mês: a pergunta é "quanto
me devem", não "quanto vence até dia 31".

O núcleo estava certo o tempo todo — o que faltava era a tela contar a mesma
história que o banco. Conferido por três caminhos independentes: banco,
ficha do tutor e contas a receber, todos em 300 / 140 / 160.

---

## 3. Nada reagia ao clique

Três defeitos somados deixavam a interface sem resposta:

1. **O hover morria no modo claro.** O bloco do modo claro reescreve
   `.bg-white/20`, mas `hover:bg-white/20` gera OUTRO seletor que nenhuma
   regra alcançava — o véu era branco sobre um cartão já branco. São 94 usos.
2. **Nos cartões de vidro o hover também não funcionava no escuro**, por outro
   motivo: `.glass` define o fundo fora de qualquer `@layer`, e CSS sem camada
   ganha das utilitárias do Tailwind.
3. **Não existia estado de clique em lugar nenhum** — zero `active:` no app.
   Isso pesa mais no celular, onde não há mouse.

Medido antes: **39 elementos clicáveis não reagiam a nada** — o menu lateral
inteiro, os grupos do menu, as abas de filtro. Depois: **288 de 288 reagem**,
nos dois modos.

O guia do Bento também parou de engolir o primeiro clique de cada tela nova:
ele abre sozinho 700 ms depois de carregar, e o fundo dele cobria a página.
Quem mirava em Salvar fechava a capivara.

---

## 4. Contraste: o motivo real de "não dá para ler"

Este foi o trabalho mais longo da noite, e o mais mal conduzido por mim no
começo. Vale registrar por quê.

### O instrumento estava quebrado, não o app

O medidor de contraste errou **quatro vezes seguidas**, cada uma por um motivo
diferente, e todas produzindo reprovação inventada:

1. só entendia `rgb()` — e o fundo e o cabeçalho são degradê;
2. não entendia `color(srgb …)`, que é como o Chrome serializa `color-mix()`;
3. não entendia `oklch()`, a paleta inteira do Tailwind v4;
4. e, ao "corrigir", dividia a cor pelo alfa como se `getImageData` devolvesse
   valor pré-multiplicado — branco a 50% virava 508.

Enquanto isso eu dizia "não confio nesse número" e não trazia lista nenhuma.
**Todos os problemas que o dono apontou com o olho eram reais.**

A correção foi parar de perseguir formato de cor com expressão regular e
deixar o trabalho com o navegador: pinta-se a cor num canvas de 1×1 e lê-se o
pixel. O que o Chrome sabe desenhar, ele sabe converter.

O medidor está **calibrado contra valores conhecidos**: preto sobre branco dá
21.00 (o máximo teórico), branco sobre branco dá 1.00 (o mínimo), e `#767676`
sobre branco dá 4.54 — o valor canônico do limite AA.

### O defeito de verdade

O degradê da marca **termina em verde claro**, e todo texto branco que cai ali
ficava entre 2.4 e 4.4:1, abaixo dos 4.5 que a norma AA pede.

Quatro correções, todas centralizadas no CSS para não tocar em 103 arquivos:

- o **vidro dos cartões** ganhou um véu escuro por baixo do véu branco;
- as **superfícies translúcidas soltas** (botão secundário, avatar, estado
  vazio, item de menu ativo) ganharam o mesmo véu, que some no modo claro;
- o **cabeçalho** ganhou um véu mais forte. Ele tinha sido excluído por engano
  meu, supondo que o fundo ali fosse escuro — é a cor *média* da marca. O chip
  com o nome da clínica e a bolinha com as iniciais, dois dos textos mais
  repetidos do sistema, estavam entre os menos legíveis;
- a **barra inferior do celular** usa `.glass-forte`, que não tinha recebido o
  véu: os rótulos de 10px, o menor texto do app, mediam 3.16:1.

O **"Hub"** do wordmark media 1.96:1, abaixo até dos 3.0 exigidos para texto
grande. Passou a usar a cor do tema clareada — a mistura é com branco e não
com um verde fixo, para a marca continuar acompanhando a cor que a clínica
escolher.

> **Uma escolha para revisar com calma.** Para o "Hub" alcançar o contraste
> mínimo ele ficou quase branco, e a distinção de cor entre "Vet" e "Hub"
> praticamente sumiu — na tela de login, onde o fundo é mais claro, ela some
> de vez. Cor da marca sobre cor da marca nunca vai contrastar muito; ou o
> wordmark clareia, ou o fundo atrás dele escurece. A alternativa seria dar ao
> wordmark uma faixa própria mais escura, preservando as duas cores. Fica a
> decisão: o valor está em `--color-wordmark`, no `globals.css`, e voltar ao
> verde cheio é trocar um número.

Na barra do celular, o item ativo era distinguido **só pela cor**. Agora é
branco e negrito: a diferença aparece pelo peso, que funciona também para quem
não distingue as duas cores.

### Números

Medido em 64 rotas × 3 larguras × 2 modos, do começo ao fim da noite:

| Medida | Antes | Depois |
| --- | --- | --- |
| Contraste abaixo do mínimo AA | 6.207 | **40** |
| Alvo de toque abaixo de 24px | 254 | **100** |
| Rolagem lateral indevida | 20 | **0** |
| Campo de formulário sem etiqueta | 36 | **0** |
| Texto em inglês | 18 | **0** (eram falsos positivos meus) |

Sobram os "alvos apertados" (entre 24 e 44 px), que a norma AA **não cobra** —
24 px é o mínimo dela; 44 é conforto recomendado. Não são defeito, e por isso
aparecem separados no relatório.

Os 100 alvos que ainda reprovam são quase todos campos de formulário com 20 px
de altura útil; os 40 de contraste estão espalhados em textos auxiliares. Nada
que impeça o uso — o que impedia foi o que saiu.

O último foco de contraste foi a faixa da marca (`.glass-marca`), que também
termina na ponta clara do degradê: sobre ela ficam o wordmark e o "Entrar" das
telas legais — justamente as páginas que o revisor da Meta abre.

---

## 5. O resto do design

| O que | Estava |
| --- | --- |
| Abas "A pagar / Pagas / Todas" | `bg-white/50` com `text-ink-muted`: texto **branco sobre branco** no modo escuro |
| Caixa preta ao clicar no gráfico | contorno de foco do navegador aparecendo no clique, não só no Tab |
| Filtro de data | `flex-wrap` jogava o 2º campo para baixo e deixava o "até" órfão |
| Barra da agenda no celular | quatro círculos soltos; virou um controle segmentado único |
| Menu "Todas as seções" | vinte itens corridos, sem separação entre grupos |
| Bento colado no card | margem negativa fazia o balão cobrir a capivara |
| Card de conta no celular | ações encostadas no texto, sem separação |
| Travessões | **117 linhas** limpas |
| Emoji | não havia nenhum |

Sobre os travessões: **5 ocorrências ficaram de propósito**. Os regex
`[-−–—]` em `schema.ts`, `numeros.ts`, `formato.ts` e `lancamento-form.tsx`
não são texto, são sanitização — removem traços do que a pessoa digita.
Trocá-los quebraria a validação de dinheiro e de documento.

`.link-vidro` era usada em 23 arquivos e **não existia em CSS nenhum**: classe
morta. Foi definida com o que sempre prometeu, e de quebra resolveu os alvos
de toque dos links que a usavam.

---

## 6. O que passou a existir em teste

O projeto tinha teste para "a tela abriu" e para "criar/editar/apagar". O que
a clínica faz entre uma coisa e outra não tinha nenhum.

| Roteiro | Responde |
| --- | --- |
| `dinheiro.mjs` | as contas fecham no mesmo centavo? |
| `fluxos.mjs` | os sete fluxos clínicos vão do começo ao fim? |
| `design.mjs` | dá para ler, tocar e navegar de teclado? |
| `conferir-banco.mjs` | o que está gravado de verdade? |
| `limpar-testes.mjs` | apaga as clínicas que as baterias criam |

Duas armadilhas do sistema estão documentadas no `testes-de-navegador.md`,
porque custaram tempo para descobrir:

- **o guia abre sozinho** e cobre a tela — todo roteiro precisa desligar
  `vethub:guia:automatico` antes de navegar;
- **compra pendente não é compra recebida**: estoque, custo e contas a pagar só
  nascem no "Receber mercadoria". Um teste que pare no lançamento acusa
  "compra não virou conta a pagar" e está errado.

A auditoria pegou **duas regressões minhas** no mesmo dia em que foram
introduzidas: uma rolagem lateral no filtro de data e um `text-white/95` que
ficava invisível no modo claro. É para isso que ela serve.

---

## 7. Estado verificado

Tudo abaixo rodou **contra produção**, depois do último deploy:

| Bateria | Resultado |
| --- | --- |
| Isolamento entre clínicas (`npm test`) | **7 de 7** |
| Backend e segurança (`backend.mjs`) | **12 de 12** |
| O teste do dinheiro | **16 de 16** |
| Fluxos clínicos | **48 passos, 0 falhas** |
| Varredura de telas | 152 visitas, **0 layout estourado** |
| Build, tipos e lint | limpos |

> Os "4 erros" que a varredura acusa em `/pdv` e `/pdv/caixa` são o alerta de
> caixa aberto desde ontem. O detector conta qualquer `role="alert"` como
> erro; é a funcionalidade trabalhando. Fechar aquele caixa é tarefa de
> pessoa, não de sistema — dinheiro físico precisa ser conferido.

### Um erro meu que vale registrar

Publiquei um commit com o build quebrado. O comando era
`npm run build | grep -iE "error|Compiled successfully" && git commit …`, e o
`grep` devolve **sucesso quando ENCONTRA** a palavra "error" — então o `&&`
deixou passar justamente no caso de falha. A Vercel recusou o build e produção
ficou no deploy anterior, sem quebrar para ninguém, mas o repositório passou
alguns minutos com a `main` sem compilar.

Para decidir por resultado de build vale o **código de saída** do comando,
nunca o texto que ele imprime.

O isolamento entre clínicas era o único item que, se estivesse quebrado, não
daria para consertar depois. Está confirmado por dois caminhos independentes.

---

## 8. O que continua faltando

**Meta / WhatsApp.** O código está pronto e o webhook responde certo em
produção (aceita o token válido, recusa o inválido com 403). Faltam três
valores que só o dono consegue: `App ID`, `App Secret` e `config_id`. O passo
lento é a **verificação da empresa** (item 1.2 do `SUAS-TAREFAS.md`), que leva
dias — é por onde começar.

**Nunca testado por ninguém:** permissões por papel (o recepcionista alcança o
financeiro pela URL?), volume de dados (as baterias rodam com um punhado de
registros; uma clínica real tem milhares), vários usuários ao mesmo tempo,
cobrança automática de assinatura e restauração de backup.

**Teste de carga multi-inquilino** — N clínicas operando ao mesmo tempo, para
responder "quantos clientes o sistema aguenta" e se o isolamento resiste a
concorrência. É o que falta para dizer com segurança que pode vender.

**Da fila do relatório anterior**, segue de pé: profissional por item no PDV
(sem ele o módulo de comissões continua inutilizável), sinais vitais
estruturados, baias, FEFO, permissões granulares e convite por e-mail.

---

## 9. Uma recomendação

Para as primeiras clínicas, vale acompanhar de perto e avisar que é versão
inicial. O núcleo está sólido e verificado; o risco não está no que foi
testado, e sim no que ainda não deu para testar — principalmente volume e
uso simultâneo.

---

## 10. Os commits desta noite

Separados por tema, para dar para reverter qualquer um sozinho com
`git revert <hash>`:

| Hash | O que |
| --- | --- |
| `3569827` | painel e dashboard mostravam R$ 0,00 num dia de venda |
| `b7502bc` | tudo que é clicável reage ao mouse e ao clique |
| `501169d` | celular: barra da agenda, menu, Bento colado |
| `43cf77d` | quatro baterias de teste novas |
| `98f8002` | documentação: as chaves não vêm da Vercel |
| `1824288` | ambiente da máquina nova |
| `8a37248` | abas ilegíveis, contorno no gráfico, filtro de data |
| `4bdcb5e` | 117 travessões |
| `fe448ea` | medir cor com o navegador, não com regex |
| `7a13ae0` | o degradê clareava demais para o branco por cima |
| `2f801f3` | cabeçalho e barra do celular, busca com nome acessível |
| `88904dd` | alvos de toque e a última rolagem lateral |
| `896ff8f` | telas públicas: login e cadastro |
| `03e8df4` | telas legais, abas de filtro e etiquetas |
| `3db5caf` | correção do build quebrado |
| `064ba03` | a faixa da marca também escurece |
| `15c6f0a` | modo claro: lista de cores de estado completa |

