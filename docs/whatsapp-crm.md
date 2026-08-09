# O WhatsApp do VetHub

Especificação do que provavelmente é o recurso mais vendável do sistema
inteiro. Escrito em 08/08/2026.

## Por que este é O recurso

A recepcionista de clínica veterinária já manda mensagem no WhatsApp o dia
todo — do celular dela, uma por uma, copiando nome e horário na mão. Ela
esquece metade, o cliente falta, e a clínica perde a consulta.

Nenhum sistema do meio do mercado resolve isso dentro do plano:

| Concorrente | O que cobra por WhatsApp |
| --- | --- |
| Vetwork | **R$ 179,90/mês** pelo chatbot, à parte |
| SimplesVet, Vetsoft, Vetus | pacote de mensagens, à parte |
| Loopvet | grátis, mas é o único |

Ou seja: **entregar API oficial da Meta com automação dentro do plano é
posicionamento sozinho.** É o argumento que faz a clínica pequena trocar de
sistema, e é por isso que ele desceu do Completo para o Profissional (ver
`docs/planos-da-conta.md`).

## São TRÊS coisas diferentes, e elas se confundem

Vale separar, porque cobram diferente e se constroem em ordens diferentes.

### 1. Mensagem automática — sem inteligência nenhuma

O sistema dispara sozinho quando algo acontece na agenda. É "aconteceu X,
manda o texto Y". Não tem IA, não tem decisão, não tem risco de responder
besteira.

**É a cota de 500 / 2.000 mensagens do plano.** Custa R$ 0,035 cada.

### 2. Chatbot — quando o tutor escreve

Responde quem chega. Pode ser menu numerado ("1 agendar, 2 falar com
alguém") ou IA entendendo texto solto.

**Custa quase nada de mensageria**, porque quando o tutor escreve primeiro
ele abre uma janela de 24 h em que tudo é gratuito (ver adiante). O custo, se
houver, é da IA interpretando.

### 3. IA de prontuário — não é WhatsApp

O veterinário grava a consulta, a IA escreve o prontuário e resume o
histórico do pet antes do atendimento. É para dentro da clínica, não para o
tutor.

**É a cota de 150 consultas gravadas do Completo**, e não tem relação nenhuma
com as outras duas. Chamar as duas de "IA" é o que confunde.

---

## Os gatilhos

Todos saem de dado que **já existe no banco**. Nenhum exige tabela nova.

| Gatilho | Quando dispara | De onde vem | Categoria Meta |
| --- | --- | --- | --- |
| **Confirmação** | agendamento criado | `agendamento.data_hora` | utility |
| **Lembrete de véspera** | 1 dia antes | `agendamento.data_hora` | utility |
| **Vacina vencendo** | 15 dias antes | `protocolo_saude.proxima_dose` | utility |
| **Pet pronto** | banho e tosa finalizado | `execucao_banho_tosa` | utility |
| **Conta a vencer** | 1 dia antes | `lancamento_financeiro` | utility |
| **Retorno de consulta** | data marcada pelo vet | `consulta` | utility |

O telefone vem de `tutor.telefone`, que já existe. A conexão da clínica vem
de `whatsapp_conexao` (`waba_id`, `phone_number_id`), que também já existe.

### Os quatro primeiros são o produto

Confirmação, véspera, vacina e pet pronto resolvem a dor inteira. Os outros
dois são bônus. **Começar por menos é o certo:** cada modelo precisa ser
aprovado pela Meta antes de rodar, e seis pedidos de aprovação numa tacada é
seis chances de reprovar.

---

## Os modelos de mensagem

A Meta exige **modelo aprovado** para mandar mensagem fora da janela de 24 h.
O texto vai com variáveis, e a categoria escolhida decide o preço.

```
confirmacao_agendamento          [utility]
Olá {{1}}! O horário do {{2}} está marcado para {{3}}.
Pode confirmar respondendo SIM?

lembrete_vespera                 [utility]
Oi {{1}}, passando para lembrar: amanhã às {{2}},
consulta do {{3}} na {{4}}. Até lá!

vacina_vencendo                  [utility]
Oi {{1}}! A vacina {{2}} do {{3}} vence em {{4}}.
Quer que eu já reserve um horário?

pet_pronto                       [utility]
{{1}}, o {{2}} está pronto e cheiroso! Pode buscar
até {{3}}. 🐾
```

### Categoria: sempre utility, nunca marketing

Não é detalhe de forma, é decisão de dinheiro (tabela oficial da Meta em BRL,
ver `docs/custos-whatsapp.md`):

| Categoria | Preço por mensagem |
| --- | --- |
| **Utility** | **R$ 0,0350** |
| Marketing | **R$ 0,3217** — 9× mais cara |

Uma mensagem sobre um agendamento que existe é utility. A mesma mensagem com
"aproveite 10% de desconto" grudada no fim vira marketing e custa nove vezes
mais. **Nunca misturar promoção em mensagem transacional** — o texto fica
pior e o custo explode.

---

## A janela de 24 horas é a alavanca

Este é o detalhe que separa um custo de R$ 5 de um de R$ 80 por clínica:

> Quando o **tutor escreve primeiro**, abre uma janela de 24 h em que
> **qualquer mensagem é gratuita** — inclusive resposta livre, sem modelo.

Consequência de produto, não de preço: **desenhar tudo para o tutor
responder.** Por isso as mensagens terminam em pergunta ("Pode confirmar?",
"Quer que eu reserve?"). Um "SIM" do tutor abre 24 h de conversa grátis, e é
dentro dela que o chatbot trabalha sem custo nenhum de mensageria.

Mensagem que não pede resposta é dinheiro jogado fora duas vezes: paga o
envio e não abre a janela.

---

## E aqui vira um CRM

Reparado durante a conversa de 08/08, e vale registrar como direção de
produto:

Juntando **confirmação + lembrete + histórico da conversa + ficha do pet**,
o que sai não é "integração de WhatsApp". É a linha do tempo de
relacionamento com o tutor:

```
Ana Paula · tutora do Thor (golden, 4 anos)
─────────────────────────────────────────────
08/08  ✓ confirmou consulta de 12/08
02/08  ✉ lembrete de vacina V10 — respondeu "pode marcar"
28/07  🛁 banho e tosa — retirou às 16h
15/07  ⚕ consulta · dermatite · Dra. Ana
```

Nenhum concorrente do meio do mercado tem isso. E é construído com dado que
o sistema **já guarda** — falta só juntar numa tela.

Isso abre coisas que ninguém no setor faz: ver quem **parou de aparecer** (o
relatório de clientes já calcula), quem tem vacina atrasada, quem nunca
voltou depois da primeira consulta. Cada uma dessas listas é um botão de
"mandar mensagem para todos" — e é aí que a campanha em massa entra, com
saldo pré-pago, como está definido em `docs/planos-da-conta.md`.

---

## O que existe hoje

| | Estado |
| --- | --- |
| Conectar o número (`/configuracoes/whatsapp`) | tela pronta, Embedded Signup |
| Tabela `whatsapp_conexao` | pronta, com `waba_id` e `phone_number_id` |
| Webhook `/api/whatsapp/webhook` | **esqueleto** — responde 200 e descarta |
| Envio de mensagem | não existe |
| Modelos aprovados na Meta | nenhum submetido |
| Fila de disparo | não existe |

Ou seja: a porta de entrada está pronta, o resto é por construir.

---

## Ordem de construção

**Fase 1 — mandar mensagem.** Webhook de verdade (validar assinatura do App
Secret, rotear por `phone_number_id` para a clínica certa), envio pela Cloud
API, e os 4 modelos submetidos à Meta. Uma fila com repetição, porque a Meta
falha e não se pode perder lembrete.

**Fase 2 — receber resposta.** "SIM" confirma o agendamento sozinho. Aqui já
aparece a caixa de conversa dentro do VetHub, e o atendente responde de
dentro do sistema em vez do celular pessoal.

**Fase 3 — a linha do tempo.** Juntar conversa, consultas, vacinas e banhos
na ficha do tutor. É o CRM descrito acima.

**Fase 4 — chatbot.** Só depois de ter cliente usando e saber o que ele
pergunta de verdade. Menu numerado antes de IA: é mais barato, mais previsível
e resolve 80% dos casos.

## O que NÃO fazer

- **Mensagem promocional junto da transacional.** Custa 9× e piora o texto.
- **Disparo em massa sem saldo pré-pago.** 5.000 tutores em marketing são
  R$ 1.608 num clique.
- **Cortar mensagem no meio do mês por estouro de cota.** Cobra o excedente;
  cortar lembrete é o que faz cancelar.
- **Chatbot com IA antes da Fase 4.** Responder besteira sobre saúde animal
  no WhatsApp da clínica é risco que não se paga.

## O que depende do dono

App ID, App Secret e `config_id` de um app Business da Meta. Ver
`docs/SUAS-TAREFAS.md`, item 1 — e a observação de 08/08: a verificação da
empresa é do **Portfólio**, não do app, então um segundo app dentro de um
portfólio já verificado pula a parte lenta.
