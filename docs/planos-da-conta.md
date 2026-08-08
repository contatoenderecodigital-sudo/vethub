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
| Usuários | 2 | 5 | sem limite |
| Internação | — | ✓ | ✓ |
| Comissões | — | ✓ | ✓ |
| Planos e assinaturas | — | ✓ | ✓ |
| Relatórios completos | — | ✓ | ✓ |
| Várias unidades | — | — | ✓ |
| WhatsApp | — | — | ✓ |
| Inteligência artificial | — | — | ✓ |
| Nota fiscal | — | — | ✓ |

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

**Preço ainda não está definido.** A tela de assinatura não mostra valor
nenhum, e é melhor assim: número errado na tela é pior que número nenhum.

## Onde a política mora

Em **um arquivo só**: `src/lib/plano-conta.ts`.

Nenhuma tela pergunta "o plano é completo?". Ela pergunta "esta conta tem o
recurso `internacao`?". Mudar a política comercial é mexer numa linha ali, e
não caçar condição espalhada por 76 telas.

```ts
temRecurso(conta.plano, "internacao")     // esta conta tem?
tetoDeUsuarios(conta.plano, conta.limite_usuarios)  // quantos usuários cabem?
planoQueInclui("whatsapp")                // qual plano a tela de venda oferece?
```

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

`tests/varredura/planos-da-conta.mjs` — 42 verificações. Ele cria uma clínica
virgem, rebaixa para Essencial pelo `service_role`, e então:

- confere que as 11 telas travadas desviam para a explicação certa;
- confere que as 22 telas do dia a dia continuam abrindo (trava que pega
  demais é tão ruim quanto trava que não pega);
- confere os cadeados no menu;
- sobe para Completo e confere que tudo destrava;
- **posta o formulário de verdade** para criar o terceiro usuário no plano de
  dois, e pergunta ao banco quantos usuários sobraram;
- tenta se autopromover a Completo pelo banco, como o admin faria.

```
node --env-file=.env.local tests/varredura/planos-da-conta.mjs
```

## O que falta

- **Preço e cobrança.** Nada nesta estrutura cobra ninguém ainda; a troca de
  plano hoje é manual, pelo `service_role`.
- **O que acontece quando o teste vence.** `trialExpirou()` já responde a
  pergunta, mas ninguém a faz ainda — a conta continua funcionando depois do
  14º dia. Falta decidir se ela cai para Essencial ou trava.
- **WhatsApp, IA e nota fiscal** estão no mapa de recursos e aparecem na
  tabela como "em breve", mas ainda não existem no sistema. Quando ficarem
  prontos, já nascem no plano certo sem mexer em mais nada.
