# Prompt para agente de navegador (reauditoria)

Versão enxuta e sem gatilhos falsos de recusa. Copie **tudo daqui para baixo**.

Deixe o navegador **já logado no VetHub** antes de colar. O prompt não pede
login nem senha de propósito: agente nenhum precisa das suas credenciais para
olhar uma sessão que já está aberta.

---

Sou o dono e desenvolvedor do **VetHub**, um sistema de gestão para clínicas
veterinárias que eu mesmo construí, publicado em https://vethub-tau.vercel.app.
O sistema ainda **não tem nenhum cliente em produção**: todos os dados lá
dentro são de teste, criados por mim. Preciso da sua ajuda para um **teste de
aceitação** antes de colocar a primeira clínica real para usar.

A aba já está aberta e logada no sistema — **é só continuar dali**. Trabalhe
apenas dentro do domínio `vethub-tau.vercel.app`.

Regras de trabalho:

1. Pode criar registros à vontade. Comece todo nome com `ZZ Teste` para eu
   achar e apagar depois.
2. **Não apague nem edite** registro que não tenha sido criado por você.
3. Não invente defeito para encher relatório. Se a tela está boa, diga que está.
4. Para cada defeito, me dê: **a rota**, **o que você fez**, **o que esperava**,
   **o que aconteceu** e um **print**.

## Prioridade 1 — as contas fecham?

Esta é a parte que mais importa. A regra do sistema é: **toda venda vira uma
conta a receber**, e o pagamento dá baixa nela. A ficha do tutor, a tela de
contas a receber e o painel financeiro têm que contar a mesma história.

Faça, nesta ordem, anotando os valores em cada passo:

1. Crie um tutor `ZZ Teste Fluxo` e um pet dele.
2. No PDV, abra o caixa e faça **uma venda à vista** de valor conhecido
   (ex.: R$ 100,00) para esse tutor.
3. Faça **uma venda fiada** (a prazo) de R$ 200,00 para o mesmo tutor.
4. Faça **uma venda mista**: R$ 150,00 sendo R$ 50,00 pagos agora e R$ 100,00 a
   prazo.
5. Agora confira e me diga se os três lugares batem **no mesmo centavo**:
   - a ficha do tutor (extrato / financeiro dele)
   - `/financeiro/receber`
   - `/financeiro` no modo **Caixa** e no modo **Competência**
6. Dê baixa parcial numa conta em aberto (pague metade) e confira os três
   lugares de novo.

Me diga explicitamente: **os números batem ou não?** Se não baterem, quero a
tabela com o valor que cada tela mostrou.

## Prioridade 2 — a mensagem de erro na URL

O sistema mostra avisos numa faixa vermelha no topo. Eu mudei recentemente a
forma como essa mensagem viaja e quero confirmar que a correção pegou.

Tente abrir rotas com um texto na URL, por exemplo:
`/dashboard?erro=texto-de-teste-123`, e o mesmo em `/tutores`, `/pdv`,
`/financeiro` e `/agenda`.

O comportamento **correto** é o texto da URL ser **ignorado** — a faixa
vermelha não deve exibir nada que veio de fora. Se em alguma rota o texto
`texto-de-teste-123` aparecer **visível na tela**, me avise com a rota exata: é
um defeito que preciso corrigir antes de vender o sistema.

> **Atenção para não reportar falso positivo:** esse texto **aparece sim** no
> código-fonte da página, dentro do payload interno do Next.js (o bloco
> `self.__next_f`, que guarda a URL e os parâmetros da rota). Isso é normal e
> não é defeito. Só conta como defeito se o texto for **renderizado como
> conteúdo visível** — dentro da faixa de aviso, num elemento com
> `role="alert"`. Confie no que se vê na tela, não no Ctrl+F do código-fonte.

## Prioridade 3 — o que quebrou nas mudanças recentes

Fiz muitas alterações de uma vez (22 mudanças num dia, incluindo mudanças na
estrutura do banco). Regressão, se existir, está aqui. Percorra estes caminhos
inteiros e me diga onde travou:

1. Cadastrar tutor → cadastrar pet → agendar consulta
2. Agenda: check-in → atendimento → prontuário → receita → orçamento → check-out
3. Orçamento aprovado → botão **Cobrar no PDV** → a venda sai certa?
4. Cadastrar produto → dar entrada de estoque → conferir se o saldo mudou
5. Internar um pet → prescrever → marcar como aplicada → dar alta
6. Compra de fornecedor **com frete e parcelada** → conferir se o frete entrou
   no custo do produto e se nasceu uma conta a pagar por parcela
7. Em **7 telas** o botão **Excluir** fica dentro do menu `⋯`
   (fornecedores, pets, consultas, receitas, internação, compras, orçamentos):
   confirme que em todas elas a janela de confirmação **abre** e que o item
   realmente some.

## Prioridade 4 — campos e formulários

- Campo de **data**: dá para digitar `15032016` e virar `15/03/2016`? Uma data
  impossível como `31/02/2024` é recusada?
- Campo de **dinheiro**: digite valores e confira que não aparece coisa como
  `45,0042,50`.
- **CPF e CNPJ**: têm máscara? Um CPF inválido é recusado?
- Salve um formulário **vazio**: aparece um resumo dizendo quais campos faltam,
  e a tela rola até o primeiro campo com problema?
- Digite um nome bem longo (`Maria Aparecida da Conceição dos Santos Oliveira`)
  e veja se estoura o layout em alguma lista.
- Num campo de observação, cole o texto `<b>negrito</b>` e salve. O correto é
  aparecer literalmente `<b>negrito</b>` na tela. Se aparecer **negrito**
  formatado, me avise — o texto está sendo interpretado como código.

## Prioridade 5 — telas e responsividade

Percorra as telas principais em **375 px** (celular) e **1440 px** (notebook):

`/dashboard` `/agenda` `/agenda/kanban` `/consultas` `/tutores` `/pets`
`/itens` `/estoque` `/compras` `/orcamentos` `/pdv` `/pdv/caixa` `/vendas`
`/financeiro` `/financeiro/receber` `/financeiro/pagar` `/planos`
`/relatorios` e os relatórios dentro dele `/internacao` `/banho-tosa`
`/configuracoes/clinica` `/configuracoes/usuarios`

Anote onde houver:

- rolagem lateral da página (nunca pode acontecer) — diga qual elemento estoura
- texto cortado, coluna torta, botão quebrado em duas linhas
- erro no console do navegador ou requisição falhando
- botão que não faz nada
- **emoji na interface** (o sistema usa só ícones Lucide; emoji é defeito)
- texto que não esteja em português

O sistema tem um seletor de cor no cabeçalho. Teste em pelo menos 3 temas e no
**modo claro**, e diga se algum texto ficou ilegível.

## Formato da resposta

Comece com **5 linhas** de resumo: o estado geral e as 3 coisas mais urgentes.

Depois, agrupado por gravidade — **Quebrado** (impede o uso ou erra dinheiro),
**Atrapalha**, **Acabamento** — e no fim uma seção **O que está bom**, porque
preciso saber o que não mexer.

Quando conseguir, diga em qual arquivo o problema provavelmente está, usando o
padrão do Next.js: a rota `/agenda` mora em `src/app/(app)/agenda/page.tsx`.
