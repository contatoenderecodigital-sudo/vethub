# Os planos que a clínica paga

## O nome, primeiro

O sistema tem duas coisas chamadas "plano" e elas não têm nada a ver uma com a
outra:

| Onde | O que é | Quem paga |
| --- | --- | --- |
| `/planos`, tabela `plano` | plano de **saúde** do pet | o tutor paga à clínica |
| `/assinatura`, coluna `clinica.plano` | **assinatura do VetHub** | a clínica paga a nós |

Por isso a tela do segundo se chama **Assinatura**, e não "Planos". Em texto,
código e conversa, ele é sempre "o plano **da conta**".

## Os três planos

A divisão é por **funcionalidade + número de usuários**. Não há plano por
volume de atendimento: contar consulta faria a clínica evitar registrar
consulta, que é exatamente o contrário do que queremos.

| | Essencial | Profissional | Completo |
| --- | --- | --- | --- |
| **12 meses** (por mês) | **R$ 149** | **R$ 329** | **R$ 699** |
| **6 meses** (por mês) | R$ 169 | R$ 379 | R$ 789 |
| **1 mês** | R$ 189 | R$ 419 | R$ 879 |
| Usuários | 3 | 8 | sem limite |
| Internação | — | ✓ | ✓ |
| Nota fiscal | — | ✓ | ✓ |
| Comissões | — | ✓ | ✓ |
| Planos e assinaturas | — | ✓ | ✓ |
| Relatórios completos | — | ✓ | ✓ |
| Várias unidades | — | — | ✓ |
| WhatsApp | — | — | ✓ |
| Inteligência artificial | — | — | ✓ |

Agenda, prontuário, receituário, banho e tosa, tutores, pets, estoque,
compras, PDV e financeiro estão em **todos**. Um sistema de gestão sem isso
não é um plano mais barato, é uma demonstração.

O **teste gratuito** dura 14 dias com tudo liberado e 3 usuários. Ele é
generoso de propósito: quem nunca viu a internação funcionando não sente
falta dela depois.

### Por que esses separadores

São os mesmos que SimplesVet, Vetsoft, Vetus e Vetwork já cobram à parte
(`docs/concorrentes/mercado.md`). O veterinário já reconhece internação,
nota fiscal, WhatsApp, IA e multi-unidade como "coisa de plano melhor" — não
foi preciso inventar nenhuma linha divisória nova, o que evita a pior
conversa de venda que existe, a de explicar por que aquilo custa mais.

## Os preços, e por que são esses

Todos os valores de concorrente abaixo foram lidos nas páginas oficiais em
04/08/2026 (`docs/concorrentes/mercado.md`).

### O preço de verdade é o de 12 meses

R$ 149 / R$ 329 / R$ 699 **não são o preço com desconto** — são o preço. Foram
calculados contra o custo real do concorrente, e são eles que vão grandes no
site. Os ciclos curtos é que cobram um acréscimo de quem não quer se
comprometer.

Isso inverte o padrão de mostrar o mensal grande e o anual como promoção, e é
de propósito: com o anual como vitrine, o número que o cliente compara com a
concorrência já é o melhor que temos.

### A escada: 10% e 20%

| | 1 mês | 6 meses | 12 meses |
| --- | --- | --- | --- |
| Desconto | — | 10% | 20% |
| Essencial | R$ 189 | R$ 169 | R$ 149 |
| Profissional | R$ 419 | R$ 379 | R$ 329 |
| Completo | R$ 879 | R$ 789 | R$ 699 |
| Economia no ano | — | R$ 240 / 480 / 1.080 | **R$ 480 / 1.080 / 2.160** |

**Os degraus são parelhos de propósito**: 10 pontos do mensal para o
semestral, 10 do semestral para o anual. A alternativa considerada (10% e
15%) foi descartada porque o segundo degrau valeria metade do primeiro — o
cliente dobraria o compromisso para ganhar menos, e o plano de 6 meses
deixaria de ter razão de existir.

Também foi considerado 15% e 25%. Descartado porque levaria o Profissional
mensal a R$ 439, encostando no custo real da Vetwork (R$ 449,80): quem
compara só o mensal deixaria de ver vantagem, e o efeito de vitrine se
voltaria contra nós.

**O desconto não sai da nossa margem.** Como o preço anual é fixo, a
porcentagem só decide quanto custa o mensal. A receita de um cliente anual é
a mesma nos três cenários.

### Por que cada número

**Essencial, R$ 149 por 3 usuários.** O que vende não é o preço cheio, é o
custo por usuário: **R$ 49,67**, contra R$ 114,95 do Vetus (2 usuários) e
R$ 87 do Vetsoft. Fica abaixo do Vetsoft Trio (R$ 261 por 3) e do Vetus
Essencial (R$ 229,89 por 2) entregando mais.

São **3 usuários e não 2** porque dois é exatamente onde o Vetus machuca o
cliente dele. Copiar a fraqueza do concorrente e cobrar por ela seria o pior
dos dois mundos.

**Profissional, R$ 329 por 8 usuários — é o plano que precisa vender.** A
comparação que ganha a venda é o custo *real* de uma clínica de 3 a 5 pessoas
que precisa de internação e nota fiscal:

| Concorrente | Base | +Internação | +Fiscal | **Total real/mês** |
| --- | --- | --- | --- | --- |
| SimplesVet (3 usuários) | R$ 359 | +136 | +153 | **R$ 648** |
| Vetsoft Equipe (5 usuários) | R$ 315 | +97 | +97 | **R$ 509** |
| Vetwork Profissional (5 usuários) | R$ 259,90 | +119,90 | +70 | **R$ 449,80** |
| **VetHub Profissional (8 usuários)** | | incluso | incluso | **R$ 329** |

De 27% a 49% mais barato, com uma frase só: *"tudo incluso, sem módulo
escondido"*.

A **nota fiscal está aqui**, e não só no Completo, justamente por causa dessa
tabela: fatiar internação e fiscal é a pegadinha que criticamos nos outros, e
seria estranho cobrá-la enquanto se anuncia o contrário.

**Completo, R$ 699 ilimitado.** SimplesVet Ilimitado com internação e fiscal
dá R$ 1.268; ficamos 45% abaixo com ticket alto e saudável. Ele guarda o que
é diferença real de porte (várias unidades) e o que tem custo variável de
verdade — IA e WhatsApp saem em dólar, por consulta e por mensagem.

### Condições

- **Sem taxa de implantação** — ataque direto à Peti9, que cobra.
- **Sem multa de cancelamento.** O desconto de 6 e 12 meses é
  pré-pagamento, não contrato de fidelidade: quem sai antes para de pagar as
  parcelas seguintes e perde o desconto retroativo. A frase "sem fidelidade"
  continua verdadeira.
- **Parcelamento no cartão** é o que faz o anual vender no Brasil. Sem ele,
  ninguém de clínica pequena tira R$ 3.948 do caixa de uma vez.
- **Teste de 14 dias sem cartão**, como todo o mercado faz.

### O que revisar depois

Quando IA e WhatsApp existirem, o **Completo** vira o plano de risco: no pior
caso (cliente consumindo 100% da cota de IA), a margem cai para ~19%. As duas
saídas mapeadas são cota de IA menor com pacote adicional, ou Completo a
R$ 799. A pesquisa recomenda a primeira — mantém o preço como arma e
transfere o risco para consumo medido. Detalhes em
`docs/concorrentes/mercado.md`, seção 6.4.

## Onde a política mora

Em **um arquivo só**: `src/lib/plano-conta.ts`.

Nenhuma tela pergunta "o plano é completo?". Ela pergunta "esta conta tem o
recurso `internacao`?". Mudar a política comercial é mexer numa linha ali, e
não caçar condição espalhada por 76 telas.

```ts
temRecurso(conta.plano, "internacao")     // esta conta tem?
tetoDeUsuarios(conta.plano, conta.limite_usuarios)  // quantos usuários cabem?
planoQueInclui("whatsapp")                // qual plano a tela de venda oferece?
DEFINICAO.profissional.preco.anual        // 329
economiaAnual("profissional", "anual")    // 1080
```

O **preço não fica guardado na linha da clínica**. Preço gravado vira preço
velho: uma tabela nova e as contas antigas continuariam cobrando o valor de
dois anos atrás sem ninguém perceber. Na clínica fica só o ciclo escolhido;
quando existir cobrança de verdade, o valor vai para a **fatura** — que é
registro histórico e deve mesmo congelar.

## Como a trava funciona

São **três camadas**, e só a última é que protege de verdade:

1. **Cadeado no menu** (`src/components/nav-links.tsx`) — o item continua
   visível, com um cadeado, e leva à tela que explica o recurso. Esconder
   seria pior para os dois lados: a clínica nunca descobre que existe
   internação no sistema, e nós perdemos a venda que só acontece quando
   alguém procura a função.

2. **Tela de venda** (`/assinatura/recurso/[recurso]`) — explica o que o
   recurso resolve e o que mais vem junto no plano. Em nenhum lugar dela
   aparece "acesso negado": quem chegou ali estava procurando exatamente
   aquilo, é o melhor momento que existe para vender.

3. **Barreira no servidor** — um `layout.tsx` em cada pasta travada chama
   `exigirRecurso()`. É esta que segura quem digita o endereço na mão. Ficar
   no layout, e não em cada página, faz com que **uma tela nova criada dentro
   da pasta já nasça protegida** sem ninguém precisar lembrar.

O teto de usuários é conferido em `criarUsuario` (server action), não só
escondendo o botão — o formulário é uma requisição como outra qualquer.

### O plano não muda pela aplicação

Um admin da clínica que conseguisse gravar `plano = 'completo'` teria o
sistema inteiro de graça, e editar a própria clínica é uma coisa legítima que
ele faz para trocar telefone. Por isso um **trigger** no banco recusa
qualquer mudança em `plano`, `trial_termina_em` e `limite_usuarios` que não
venha do `service_role`. A cobrança e o painel do dono passam por ali; o
navegador, nunca.

`limite_usuarios` existe para negociação: uma clínica pode fechar o
Profissional com 8 usuários. Nulo = usa o teto do plano, que é o caso normal.

## O teste

`tests/varredura/planos-da-conta.mjs` — 46 verificações. Ele cria uma clínica
virgem, rebaixa para Essencial pelo `service_role`, e então:

- confere que as 11 telas travadas desviam para a explicação certa;
- confere que as 22 telas do dia a dia continuam abrindo (trava que pega
  demais é tão ruim quanto trava que não pega);
- confere os cadeados no menu;
- sobe para Completo e confere que tudo destrava;
- confere os **nove preços** (3 planos × 3 ciclos) na tela e a economia
  anunciada, que tem que ser a conta de verdade: (mensal − ciclo) × 12;
- **posta o formulário de verdade** para criar o quarto usuário no plano de
  três, e pergunta ao banco quantos usuários sobraram;
- tenta se autopromover a Completo pelo banco, como o admin faria.

```
node --env-file=.env.local tests/varredura/planos-da-conta.mjs
```

## O que falta

- **A cobrança.** Os preços existem, mas nada cobra ninguém ainda: não há
  gateway, fatura nem parcelamento. A troca de plano e de ciclo hoje é
  manual, pelo `service_role`.
- **O que acontece quando o teste vence.** `trialExpirou()` já responde a
  pergunta, mas ninguém a faz ainda — a conta continua funcionando depois do
  14º dia. Falta decidir se ela cai para Essencial ou trava.
- **WhatsApp, IA e nota fiscal** estão no mapa de recursos e aparecem na
  tabela como "em breve", mas ainda não existem no sistema. Quando ficarem
  prontos, já nascem no plano certo sem mexer em mais nada.
