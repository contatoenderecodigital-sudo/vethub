# Prompt para auditoria no Claude in Chrome

Copie tudo daqui para baixo e cole no Claude in Chrome, com o navegador já
logado no VetHub.

---

Você vai auditar o **VetHub**, um SaaS de gestão para clínicas veterinárias e
petshops, em https://vethub-tau.vercel.app — é um sistema **meu**, então a
auditoria está autorizada. Faça uma varredura completa e me devolva um
relatório acionável.

## Contexto do produto

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase
  (Postgres com Row Level Security). Deploy na Vercel, região de São Paulo.
- **Identidade visual:** verde é a marca (`#047857` escuro → `#34D399` claro).
  O fundo do app é o degradê da marca em tela cheia e os painéis são de vidro
  fosco (glassmorphism), com **texto branco**. Existe um seletor de cor no
  cabeçalho com 8 temas — teste em pelo menos 3 deles.
- **Ícones:** biblioteca Lucide. **Não pode haver emoji em lugar nenhum da
  interface** — se achar algum, é bug.
- **Idioma:** tudo em português brasileiro.
- **Papéis de usuário:** admin, veterinário e recepção — cada um vê um menu e
  permissões diferentes.

## Como trabalhar

1. Faça login e navegue por **todas** as rotas da lista abaixo.
2. Em cada tela: tire print, inspecione o DOM/CSS quando algo parecer errado, e
   anote o problema com **rota + elemento + evidência**.
3. Teste **três larguras**: 375 px (celular), 768 px (tablet) e 1440 px
   (notebook). Se conseguir, teste também 320 px e 2560 px.
4. Não invente problema para preencher relatório. Se uma tela está boa, diga
   que está boa.
5. **Não apague nem altere dados** que não tenham sido criados por você durante
   o teste.

### Rotas a percorrer

```
/login  /cadastro  /politica-de-privacidade  /termos-de-uso  /exclusao-de-dados
/dashboard
/agenda  /agenda/kanban  /agenda/novo
/consultas  /consultas/nova  /consultas/[id]
/receitas  /receitas/nova  /receitas/[id]  /receitas/[id]/imprimir
/internacao  /internacao/nova  /internacao/[id]
/banho-tosa  /banho-tosa/fichas
/tutores  /tutores/novo  /tutores/[id]  /tutores/[id]/editar
/pets  /pets/novo  /pets/[id]  /pets/[id]/editar
/fornecedores  /fornecedores/novo
/itens  /itens/novo  /itens/grupos  /itens/marcas  /itens/unidades
/estoque  /estoque/validade  /compras  /compras/nova
/orcamentos  /orcamentos/novo
/pdv  /pdv/caixa  /vendas
/financeiro  /financeiro/receber  /financeiro/pagar  /financeiro/nova
/financeiro/comissoes  /financeiro/categorias
/planos  /planos/novo  /planos/assinaturas
/relatorios  + os 7 relatórios dentro dele
/configuracoes/whatsapp  /configuracoes/usuarios  /configuracoes/clinica
```

---

## 1. Design e acabamento visual

Procure especificamente por:

- **Espaçamento inconsistente** — cards, seções e campos que usam padding ou
  gap diferentes entre telas que deveriam ser irmãs. Compare, por exemplo, a
  lista de tutores com a de pets e a de itens.
- **Alinhamento quebrado** — rótulo que não fica em cima do campo, número que
  não alinha à direita, ícone deslocado do texto, coluna de tabela torta.
- **Quebra de linha ruim** — texto que estoura o container, palavra cortada no
  meio, `truncate` faltando em nome longo, botão que quebra em duas linhas,
  badge que embola. **Teste com nome bem longo** ("Maria Aparecida da Conceição
  dos Santos Oliveira") e com e-mail longo.
- **Hierarquia tipográfica** — títulos, subtítulos e corpo com tamanhos que não
  fazem sentido entre si; peso de fonte inconsistente.
- **Contraste** — texto branco sobre vidro claro pode ficar ilegível. Meça o
  contraste dos textos secundários (`text-ink-muted`, branco a 72%) e diga
  onde reprova no critério AA (4.5:1 para texto normal, 3:1 para texto grande).
- **Estados visuais** — hover, foco, ativo, desabilitado e carregando. O anel
  de foco aparece ao navegar por Tab? Botão desabilitado parece desabilitado?
- **O efeito de vidro** — em quais telas ele funciona e em quais parece
  "chapado" ou sujo? Menus flutuantes deixam o conteúdo de trás legível
  (isso seria um defeito)?
- **Densidade** — tem tela vazia demais (muito respiro) ou apertada demais?

## 2. Responsividade

Para cada largura, aponte:

- **Scroll horizontal na página** — isso nunca pode acontecer. Se acontecer,
  diga qual elemento estoura (use o inspetor para achar o culpado).
- **Alvo de toque menor que 44×44 px** no mobile — botões de ação em linha de
  lista são os suspeitos de sempre.
- **Tabelas** — devem rolar dentro do próprio container, não empurrar a página.
- **A navegação inferior do celular** cobre conteúdo? Dá para chegar no último
  item da lista?
- **Telas grandes (1440+)** — o conteúdo fica perdido no meio, com muito espaço
  vazio dos lados? Ou aproveita bem?
- **Formulários** — os campos empilham direito no celular?

## 3. Componentes: o que está fraco e o que usar no lugar

Liste os componentes da interface e classifique cada um: **bom / aceitável /
precisa ser trocado**. Olhe especialmente:

- Campos de formulário (input, select, textarea, checkbox, campo de data)
- Botões e suas variações
- Tabelas e listas
- Modais e painéis deslizantes
- Menus suspensos e autocomplete
- Abas e pílulas de filtro
- Badges de status
- Estados vazios e de carregamento (skeleton)
- Paginação
- Avisos de erro e sucesso
- Upload de arquivo
- Seletor de data (hoje é o nativo do navegador — avalie se compensa trocar)

**Depois recomende uma biblioteca de componentes** que combine com este
projeto (Next.js 16 + Tailwind v4 + tema de vidro customizado, sem servidor de
componentes). Considere pelo menos **shadcn/ui**, **Radix UI**, **Base UI**,
**Headless UI**, **Park UI** e **HeroUI**. Para cada uma, diga:

- Se funciona bem com Tailwind v4 e React 19 / Next 16
- Se dá para manter o visual de vidro atual sem brigar com o tema padrão dela
- Quanto trabalho seria migrar o que já existe
- Se resolve acessibilidade de verdade (foco, teclado, ARIA)
- **Sua recomendação final com o porquê** — e diga também se vale a pena não
  trocar nada.

## 4. Fluxos de uso

Percorra estes caminhos como se fosse a recepcionista da clínica e diga onde
travou, onde ficou confuso e quantos cliques foram necessários:

1. Cadastrar tutor → cadastrar pet dele → agendar consulta
2. Na agenda: fazer check-in → iniciar atendimento → preencher prontuário →
   anexar um arquivo → gerar receita → gerar orçamento → check-out
3. Vender no PDV: abrir caixa → adicionar item → pagar com duas formas →
   imprimir comprovante → fechar caixa
4. Cadastrar produto → dar entrada de estoque → conferir se o saldo mudou
5. Internar um pet → prescrever medicação → marcar como aplicada → dar alta

Anote: mensagens de erro confusas, campos obrigatórios não sinalizados,
ausência de confirmação após salvar, e lugares onde faltou um atalho óbvio.

## 5. Acessibilidade

- Navegue **só com Tab** por uma tela de formulário e uma de lista: a ordem faz
  sentido? Dá para chegar em tudo? O foco fica visível?
- Botões que são só ícone têm `aria-label`?
- Formulários: cada campo tem `<label>` associado? O erro é anunciado
  (`role="alert"`)?
- Menus suspensos: têm `aria-expanded`, `role` correto, fecham com Esc?
- Imagens têm `alt`?
- Rode o Lighthouse em modo acessibilidade em 3 telas e me passe as notas.

## 6. Segurança (observável pelo navegador)

Este é um sistema **multi-inquilino**: cada clínica só pode enxergar os
próprios dados, e o isolamento é feito por Row Level Security no banco.

Verifique:

- **Chaves expostas**: procure no HTML e no JS carregado por qualquer segredo
  que não deveria estar lá. A chave `anon` do Supabase **pode** aparecer (é
  pública por design). Já `service_role`, `META_APP_SECRET`, senha de banco ou
  token de webhook **não podem aparecer nunca** — se aparecer, é falha grave.
- **Isolamento entre clínicas**: pegue o UUID de um registro (tutor, pet,
  consulta) da URL e tente acessá-lo estando logado. Depois **crie uma segunda
  clínica** pelo /cadastro, entre com ela e tente abrir aquele mesmo UUID. O
  esperado é "não encontrado" — se aparecer o dado, é vazamento crítico.
- **Rotas protegidas**: deslogado, tente abrir /dashboard, /financeiro,
  /configuracoes/usuarios. Deve redirecionar para /login.
- **Permissão por papel**: se conseguir criar um usuário de recepção, entre com
  ele e tente abrir /financeiro/comissoes e /configuracoes/usuarios pela URL
  direta. Deve barrar.
- **Cabeçalhos de segurança**: na aba Network, veja os cabeçalhos de resposta.
  Existe `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`,
  `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`?
  Liste os que faltam.
- **Cookies de sessão**: têm `HttpOnly`, `Secure` e `SameSite`?
- **Console e Network**: tem erro no console? Alguma requisição devolvendo dado
  demais (por exemplo, uma listagem trazendo campos sensíveis que a tela nem
  usa)? Alguma chamada para domínio inesperado?
- **Formulários**: tente enviar CPF inválido, data absurda (ano 9999), valor
  negativo, texto gigante (10 mil caracteres) e HTML (`<script>alert(1)</script>`)
  nos campos de texto. O sistema deve recusar ou tratar — e o HTML nunca pode
  ser renderizado como código.
- **Upload**: tente subir um arquivo com extensão estranha e um arquivo grande
  demais. Deve recusar com mensagem clara.

## 7. Desempenho

- Rode o Lighthouse (performance) no /dashboard, numa lista grande e num
  formulário. Me passe LCP, CLS e INP.
- A navegação entre páginas é instantânea ou trava? Aparece skeleton?
- Alguma imagem pesada sem otimização?
- O bundle JavaScript está grande demais em alguma rota?

---

## Formato do relatório

Devolva assim, **priorizado por gravidade** — o que quebra ou vaza primeiro,
detalhe estético por último:

### Resumo
Cinco linhas: o estado geral do sistema e as três coisas mais urgentes.

### Problemas críticos
Vazamento de dados, falha de permissão, segredo exposto, tela quebrada.
Para cada um: **rota**, **o que acontece**, **como reproduzir**, **por que é
grave**.

### Problemas altos
Erros de fluxo, responsividade quebrada, acessibilidade impeditiva.

### Problemas médios
Inconsistência visual, espaçamento, contraste, texto confuso.

### Polimento
Detalhes finos que melhorariam o acabamento.

### Componentes
A tabela de classificação e a recomendação de biblioteca com justificativa.

### O que está bom
Seja específico aqui também — preciso saber o que não mexer.

Para cada item, quando der, diga **em qual arquivo provavelmente está** (pelo
padrão de rota do Next.js: `/agenda` → `src/app/(app)/agenda/page.tsx`), para
eu já ir direto no lugar certo.
