# Relatório: o que foi corrigido, o que não foi, e por quê

Resposta à auditoria do VetHub. Escrito para ser lido por quem fez a
auditoria — e para servir de base da próxima rodada.

**Contexto que muda tudo:** ninguém usa o sistema em produção ainda. Isso
permitiu mexer no modelo de dados na raiz em vez de remendar, o que seria
caro e arriscado com clínica real dentro.

**Números:** 22 commits, 12 migrações de banco, 40 itens entregues.

---

## 1. Achados da auditoria que NÃO se confirmaram

Testei cada crítico antes de mexer. Três estavam errados, e isso importa
porque a priorização foi feita em cima deles.

| Achado | Realidade medida |
| --- | --- |
| "Formulário falha porque o botão não está `disabled`" | O botão **está** `disabled` (medido: `disabled: true`, opacidade 0.5). O sintoma descrito é real, a causa não. `required` não resolveria: navegador nenhum valida formulário com botão desabilitado. |
| "`/pets/<id inexistente>` fica em skeleton infinito" | Não fica. Esperei 6 s e a página "Página não encontrada" apareceu normalmente. Já funcionava. |
| "Falta CNPJ e endereço da clínica no cupom" | O cupom já imprimia os dois. O que faltava era **espaço entre as colunas** (por isso `1R$ 120,00R$ 120,00`) e máscara no CNPJ. |

O achado do **prefetch** estava certo em substância e subestimado em grau:
abrir `/agenda` disparava **33** requisições, não 10–15.

---

## 2. Corrigido

### Segurança

**Golpe pelo link (o mais grave).** Reproduzido em produção antes de mexer:
`?erro=<qualquer texto>` renderizava no banner vermelho oficial, dentro da
sessão logada, com o nome da clínica no cabeçalho. Eram 66 pontos que
jogavam texto na URL e 59 telas que renderizavam cru.

A mensagem passou a viajar num cookie de 5 segundos. O proxy descarta
qualquer `erro` vindo de fora e injeta o legítimo na rota interna — **as 59
telas não precisaram de uma linha alterada**. De quebra resolveu o erro
reaparecer no F5 e ir junto ao copiar o link.

**Excluir quebrado em 7 telas** (fornecedores, pets, consultas, receitas,
internação, compras, orçamentos). A janela de confirmação nem abria. Causa:
no React o evento de um portal sobe pela árvore de *componentes*, não pela do
DOM — o clique na janela chegava ao menu "⋯", que fechava e desmontava o
botão antes do envio.

### Dinheiro

**Livro único.** Existiam duas tabelas para a mesma dívida: uma alimentava o
extrato do tutor, outra as contas a receber, e a venda fiada escrevia nas
duas. Era isso que fazia a ficha mostrar R$ 120 e o relatório R$ 450. Agora
`conta` é o único livro, e toda venda vira conta — inclusive a à vista, que
antes não virava nada (por isso o painel mostrava R$ 0,00).

**Tabela `baixa`:** cada pagamento virou evento com data e forma. Sem isso,
quem paga R$ 40 hoje e R$ 60 semana que vem tem duas entradas de caixa em
datas diferentes, e o relatório mentia.

**Painel financeiro** ganhou alternador **Caixa / Competência**. Não é
escolha entre um e outro: são perguntas diferentes ("quanto entrou" e
"quanto vendi") e ambas precisam de resposta. Decisão documentada com a
pesquisa de mercado em `docs/decisoes-financeiras.md`.

**Assinatura gera cobrança.** Era decorativa. Agora uma rotina agendada
(9h UTC = 6h em São Paulo) cria a conta a receber de cada assinatura vencida,
inclusive as atrasadas dos últimos 3 meses. A trava contra duplicidade é um
**índice único no banco**, não um `if` — `if` perde a corrida entre dois
processos, índice único não perde.

**Orçamento aprovado** deixou de ser beco sem saída: ganhou "Cobrar no PDV",
que abre o terminal com o tutor e os itens já no carrinho.

**Compra**: prazo (à vista a 60 dias) e parcelas negociáveis, uma conta por
parcela, já na categoria Fornecedores. E o **frete entra no custo** — ração
de R$ 200 com R$ 35 de frete custou R$ 235; precificar em cima de R$ 200
come a margem em silêncio. O rateio é proporcional ao valor de cada linha,
não à quantidade.

### Uso diário

**Formulários (13 telas).** O botão deixou de nascer travado. Clicou com
erro: resumo no topo ("Faltam 2 campos: Nome, Telefone"), rolagem até o
primeiro campo com problema e foco nele.

**Campo de data digitável.** Era um botão: cadastrar pet de 10 anos exigia
120+ cliques. Agora aceita `15032016` e vira `15/03/2016`; mês e ano viraram
listas; data impossível (31/02) é recusada — o `Date` do JavaScript
"consertaria" para 03/03 e mudaria o mês sem ninguém ver.

**Modo claro.** Implementado num bloco só de CSS. O app tem 489 usos de
branco fixo em 103 arquivos, e cada um significa a mesma coisa: um véu sobre
o fundo. Inverter o véu de uma vez entrega o modo claro sem tocar nos
componentes — e reverter é apagar o bloco. Contraste medido: 17.85:1 (AA
pede 4.5).

**Vacina ligada ao catálogo**, com a próxima dose calculada pelo intervalo do
item. O relatório "Vacinas a vencer" vivia zerado não por falta de vacina
aplicada, mas por falta da data do reforço — ninguém calcula isso de cabeça
no balcão.

**Multi-unidade.** Compartilhado: tutor, pet, catálogo, fornecedor, equipe.
Por unidade: estoque, caixa, venda, compra, agenda, internação — porque são
físicos. Cada clínica ganhou sua Matriz e todos os registros existentes
foram apontados para ela. Registro novo recebe a unidade por **gatilho no
banco**, para não depender de lembrar em vinte telas.

### Acabamento

Menu com dois itens acesos · CPF sem máscara · 33 → 5 requisições por página
· aviso de hidratação em toda página para quem escolheu tema · peso do
cadastro do pet não entrava no histórico · "Pagamento recebido por completo"
numa venda fiada · "1 lotes" e "1 itens" · cupom com colunas grudadas ·
Excluir vermelho solto (foi para o menu) · prescrição cortando "Duração
(dias)" · campo de custo produzindo `45,0042,50` · busca duplicada nas
fichas de tosa · "Internado há Hoje" · coluna Check-out cortada em 1400px ·
nome do tutor truncado no kanban · grupos e marcas vazios no primeiro dia.

### Achados meus (fora da auditoria)

1. **Log de auditoria** — quem criou, alterou e excluiu, por gatilho no
   banco. Tabela só-leitura, sem política de escrita: log que o usuário
   apaga não serve para nada. Em Configurações → Histórico de alterações.
2. **Alerta de caixa aberto de um dia para o outro** — o caixa de teste
   estava aberto há 2 dias somando tudo no mesmo turno, sem nenhum aviso.
3. **Backup** — procedimento e teste de restauração documentados.
4. **Clínica nova nascia sem nada** — nem sementes, nem Matriz. Sem matriz,
   o gatilho de unidade deixaria venda e estoque órfãos desde o primeiro
   dia. Agora a semente é gatilho no cadastro da clínica.
5. **Auditoria travava exclusão de clínica** — bug meu, encontrado porque as
   clínicas do teste automatizado pararam de ser apagadas. O registro virou
   best-effort: um sistema em que a auditoria impede uma venda é pior que um
   sem auditoria.

---

## 3. NÃO corrigido, e por quê

### Decisão consciente

**Agenda: visão Dia continua lista, Semana continua grade.** A auditoria
pediu grade nas duas por consistência. Discordo: Dia é a tela que a recepção
usa o dia todo, com ações por atendimento (check-in, cancelar) — grade de
horário ali afasta o botão do olho. Semana é grade porque a pergunta é "onde
tem buraco". Perguntas diferentes, formatos diferentes.

**Blobs de fundo** continuam. A auditoria atribuiu travamentos de screenshot
a eles; não reproduzi nenhum travamento nas 152 visitas por rodada, em
várias rodadas.

### Adiado pelo dono do produto

NF-e/NFS-e e WhatsApp.

### Fila, não começado

Sinais vitais estruturados na consulta · exames solicitados · botão
"Internar" na consulta · baias/boxes com ocupação · diárias automáticas ·
resumo de alta · autocomplete de raças · foto no cadastro do pet · gráfico
de peso · venda vinculada ao pet · consulta de CNPJ do fornecedor ·
responsável técnico e CRMV · papéis de Tosador e Financeiro · permissões
granulares · convite por e-mail no lugar de senha digitada pelo admin ·
FEFO no estoque · inventário com justificativa · parcelamento com taxa de
maquininha · sangria e suprimento · profissional por item no PDV (sem isso o
módulo de comissões segue inutilizável) · seleção de unidade nas telas
operacionais além do caixa.

---

## 4. O que só o dono pode fazer

| # | O quê | Por quê |
| --- | --- | --- |
| 1 | ✅ `CRON_SECRET` na Vercel | **Feito.** Confirmado no ar. |
| 2 | Teste de restauração de backup | Restaurar é operação manual no painel do Supabase. Procedimento em `docs/backup-e-restauracao.md`. Backup nunca restaurado não é backup. |
| 3 | Ajustar o intervalo das vacinas | Todas receberam 365 dias. Giárdia é 21, gripe canina varia. Em Itens → a vacina → "Reforço a cada (dias)". |
| 4 | Fechar o caixa que está aberto desde 04/08 | O sistema avisa, mas não fecha sozinho: dinheiro físico precisa ser conferido por uma pessoa. |
| 5 | Revisar grupos e marcas semeados | São sugestões do mercado brasileiro. Renomeie ou apague o que não usa. |

---

## 5. Estado verificado agora

| Bateria | Resultado |
| --- | --- |
| Varredura de telas (76 páginas × computador e celular) | **0 erros**, **0 problemas de layout** |
| Criar / editar / apagar de ponta a ponta | **14 de 14** |
| Backend e segurança (RLS, APIs, isolamento, vazamento de chave) | **12 de 12** |
| Suíte do projeto (vitest) | **7 de 7** |
| Build, tipos e lint | limpos |

> Nota para quem for auditar: a varredura acusa 4 "erros" em `/pdv` e
> `/pdv/caixa`. É o alerta novo de caixa aberto há 2 dias — o detector conta
> qualquer `role="alert"` como erro. É a funcionalidade trabalhando, não um
> defeito.

---

## 6. Para a próxima auditoria

O prompt de contraprova está em `docs/prompt-reauditoria.md`. Ele pede o
oposto da primeira rodada: **tentar quebrar** cada correção, e traz os passos
de reprodução.

Os três testes que mais interessam:

1. **O dinheiro** — vender à vista, fiado e misturado, e conferir se ficha do
   tutor, contas a receber e painel financeiro batem no mesmo centavo.
2. **O golpe pelo link** — variações de `?erro=` em várias rotas.
3. **Regressões** — foram 22 commits em um dia, incluindo 12 migrações de
   banco e 140 pontos de redirect alterados. Se algo quebrou, é aí.
