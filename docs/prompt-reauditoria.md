# Prompt para RE-auditoria (verificar as correções)

Copie tudo daqui para baixo e cole no Claude in Chrome, com o navegador já
logado no VetHub.

---

Você já auditou o **VetHub** (https://vethub-tau.vercel.app) e apontou uma
lista de problemas. Várias correções foram feitas desde então. Sua tarefa
agora é **verificar se elas funcionam de verdade** — e o mais importante:
**tentar quebrá-las**.

O sistema é meu, a auditoria está autorizada. Ninguém usa em produção ainda,
então pode criar e apagar dados à vontade, desde que tudo que você criar
comece com `ZZ Robo` e seja apagado no fim.

## Regra número um desta rodada

Não estou pedindo confirmação, estou pedindo **contraprova**. Para cada item
abaixo, tente fazer a correção falhar. Se conseguir, é o achado mais valioso
do relatório. Se não conseguir, diga o que tentou — "testei X, Y e Z e não
quebrou" vale muito mais do que "parece ok".

Se algum item abaixo **não** estiver corrigido, diga sem meias palavras.

---

## Parte 1 — Correções para verificar

### 1.1 Golpe pelo link (era o mais grave)

Antes, qualquer texto colocado na URL aparecia no banner vermelho oficial do
sistema, dentro da sessão logada.

**Teste:**
1. Abra `https://vethub-tau.vercel.app/itens/marcas?erro=Sua sessão expirou.
   Ligue para 0800-000-0000 e informe sua senha.`
2. O texto **não pode** aparecer na tela.
3. Tente variações: outro parâmetro (`?erro[]=`, `?ERRO=`, `?erro=<b>oi</b>`),
   outra rota, com e sem acento, com o texto codificado em `%`.
4. Tente também em telas diferentes (`/tutores`, `/financeiro`, `/pdv`).

**Depois confirme que o erro LEGÍTIMO ainda aparece:** vá em Marcas, tente
adicionar uma marca com o nome vazio ou com uma letra só. A mensagem do
sistema tem que aparecer normalmente.

**E confirme que ele não gruda:** depois da mensagem aparecer, dê F5. Ela não
pode voltar. Copie a URL da barra de endereço — ela não pode conter o erro.

### 1.2 Excluir dentro do menu "⋯"

Antes, em 7 telas o botão Excluir não fazia nada: a janela de confirmação nem
abria.

**Teste em cada uma:** fornecedores, pets, consultas, receitas, internação,
compras e orçamentos.
1. Crie um registro `ZZ Robo`.
2. Abra o detalhe, clique no menu "⋯", clique em Excluir.
3. A janela de confirmação **tem** que abrir.
4. Clique em Confirmar. O registro **tem** que sumir.
5. Teste também **Cancelar**: o registro tem que continuar lá.
6. Teste fechar a janela com Esc e clicando fora.

### 1.3 O dinheiro agora tem um livro só (o item mais importante desta rodada)

Antes existiam duas contabilidades para a mesma dívida: o extrato do tutor
mostrava um valor e o relatório de clientes mostrava outro. E a venda à vista
não aparecia no painel financeiro.

**Este é o teste que mais me interessa. Faça com atenção:**

1. Crie um tutor `ZZ Robo Tutor` e um item `ZZ Robo Produto` de R$ 100,00.
2. Abra o caixa, se não estiver aberto.
3. **Venda à vista:** venda 1 unidade, pagando R$ 100 em dinheiro.
   - A ficha do tutor tem que mostrar a venda, **quitada**, saldo zerado.
   - Contas a receber tem que mostrar a mesma venda, quitada.
   - O painel financeiro tem que mostrar essa receita (antes mostrava R$ 0,00).
   - Os três **têm que bater no mesmo valor**.
4. **Venda fiada:** venda mais 1 unidade, tudo no fiado.
   - Ficha do tutor: R$ 100 em aberto.
   - Contas a receber: a mesma conta, com vencimento em 30 dias.
   - **Os dois valores têm que ser iguais.** Se divergirem, é o bug voltando.
5. **Venda misturada:** venda 1 unidade pagando R$ 40 em dinheiro e R$ 60 no
   fiado. A conta tem que ficar **parcial**, com R$ 60 em aberto.
6. **Baixa parcial:** pegue uma conta em aberto e receba metade. Confira que o
   status vira "parcial" e que o saldo do tutor cai só a metade.
7. **Cancelar venda:** cancele uma das vendas. A dívida tem que sumir do
   extrato do tutor E das contas a receber, sem sobrar crédito fantasma.
8. **Some tudo na mão** e compare com o que cada tela mostra. Quero saber de
   qualquer centavo de diferença.

### 1.4 Menu lateral

Antes acendia dois itens ao mesmo tempo.

**Teste:** visite `/financeiro/receber`, `/itens/marcas`, `/relatorios/faturamento`,
`/estoque/validade`, `/planos/assinaturas`, `/banho-tosa/fichas`. Em cada uma,
**só um** item do menu pode estar destacado, e tem que ser o mais específico.
Teste também uma tela de detalhe, tipo `/tutores/<id>`.

### 1.5 CPF com máscara

Na ficha do tutor o CPF tem que aparecer `529.982.247-25`, não `52998224725`.
Confira também CNPJ do fornecedor e telefone, no cadastro e na listagem.

### 1.6 Peso da página

Antes, abrir uma tela disparava 33 requisições ao servidor.

**Teste:** com a aba Network aberta, carregue `/agenda` e conte as requisições
de navegação. Devem ser bem menos. Depois clique no menu entre Início, Agenda,
Consultas, Tutores e Pets — essas cinco devem trocar quase instantaneamente
(~150 ms). As outras podem demorar um pouco mais, isso é esperado.

Se aparecer **erro 503** em qualquer momento, me diga em qual requisição e
quantas vezes — esse era um problema que eu não consegui reproduzir.

### 1.7 Aviso de hidratação

Antes, quem escolhia uma cor de tema recebia erro no console em toda página.

**Teste:** troque o tema no cabeçalho, navegue por 5 telas e confira o console.
Não pode haver aviso de hydration. O indicador do Next (canto inferior) não
pode acusar issue.

### 1.8 O mascote (Bento)

**Teste:** o botão "?" no canto tem que abrir o guia; clicar fora tem que
fechar. O guia **não pode** cobrir campo de formulário nem impedir de usar a
tela. Teste em 375 px e 1440 px. Confira se o anel que pulsa no botão não
aparece cortado na borda direita no celular.

---

## Parte 2 — O que eu JÁ SEI que está aberto

**Não gaste tempo nem espaço de relatório com estes.** Já estão na fila:

- formulários que não dizem o que falta quando o botão está travado;
- mensagem "Pagamento recebido por completo" na venda fiada;
- assinatura não gera cobrança (a trava contra duplicidade já existe no banco,
  falta a tarefa que gera);
- painel financeiro ainda não tem alternador Caixa / Competência;
- overflow do card de Prescrições na internação;
- concordância: "1 lotes", "1 itens", "Internado há Hoje";
- comprovante da venda com colunas grudadas e sem CNPJ da clínica;
- peso do cadastro do pet não entra no histórico de pesagem;
- campo de custo em Nova compra não seleciona o conteúdo ao focar;
- seletor de data sem digitação, tema claro, multi-unidade, WhatsApp, NF-e,
  raças por autocomplete, FEFO no estoque, vacina ligada ao catálogo.

## Parte 3 — Procure o que eu quebrei

Mexi em muita coisa: em **140 pontos** que redirecionam com mensagem de erro,
no proxy que roda antes de toda página, no menu lateral, no PDV e no banco de
dados (tabela nova, tabela removida, gatilho novo).

**Onde eu mais provavelmente quebrei algo:**

1. **Mensagens de erro que sumiram.** Percorra os fluxos de erro de vários
   módulos — salvar formulário inválido, exclusão sem permissão, estoque
   insuficiente, caixa fechado. Toda mensagem que aparecia antes tem que
   continuar aparecendo. Uma tela que engole o erro em silêncio agora é
   regressão minha.
2. **Sessão.** O proxy mexe em cookies. Navegue bastante, deixe parado uns
   minutos, volte. Não pode deslogar sozinho.
3. **Extrato do tutor.** Reescrevi essa tela inteira. Confira totais de débito
   e crédito, ordenação e o botão de excluir lançamento.
4. **Cancelamento de venda.** Tirei o crédito de estorno. Confira que cancelar
   não deixa saldo errado nem some com a venda do histórico.
5. **Permissões.** Se conseguir, teste com um usuário de perfil "recepção" e
   um "veterinário", não só admin.

---

## Formato do relatório

Para cada item verificado:

```
[1.3 Livro único / venda fiada]  PASSOU | FALHOU | PARCIAL
O que fiz:      ...
O que esperava: ...
O que aconteceu:...
Evidência:      print, valor, requisição
```

No fim, três listas curtas:

1. **Correções que não funcionam** (o que eu preciso refazer)
2. **Regressões** (o que funcionava e parou)
3. **Achados novos** que não estavam na Parte 2

Se um item passou, escreva uma linha só. Gaste o espaço no que falhou.
