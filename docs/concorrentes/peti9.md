# Peti9 — análise do concorrente

Registro do que a Peti9 entrega, extraído de capturas de tela do sistema.
Serve de referência para o VetHub **igualar e superar**. Cada leva nova de
prints vira mais uma seção aqui.

> Levantamento iniciado em 04/08/2026. Fonte: prints do sistema em produção
> (contas de demonstração "PetCatia" e "Lila pets").

## 1. Navegação principal (menu lateral)

Ícone + rótulo, coluna fixa à esquerda, tema claro com destaque laranja:

| Módulo | Observações |
|---|---|
| Painel / Inteligência | Dashboard inicial |
| Item | Produtos, serviços, planos, estoque, tabelas auxiliares |
| Cliente | Tutores |
| Pet | Pacientes |
| Atendimento | Agenda + consultas (núcleo do sistema) |
| Internação | Módulo hospitalar |
| Marketing | Campanhas / relacionamento |
| Compras | Pedidos a fornecedores |
| Financeiro | Contas a pagar/receber |
| Notas Fiscais | NF-e / NFS-e |
| Integrações | Terceiros |
| Configurações | Gerais, tributação, campos obrigatórios |

Topo: menu sanduíche, atalho de calendário, botão **"Início Rápido"** (ação
primária verde), sino de notificações, busca "Pesquisar por menu", chat
"Fale com a peti9", favoritos (estrela) e identificação da conta/usuário.

## 2. Dashboard

- **4 tiles coloridos** no topo: Atendimentos Agendados para Hoje (azul),
  Atendimentos/Vendas Realizadas Hoje (amarelo), Ticket Médio de Hoje (roxo),
  Clientes Cadastrados no Mês (vermelho). Cada um com ícone à esquerda.
- **Indicadores do Atendimento**: 6 medidores circulares (gauge) — Pets no
  estabelecimento, Aguardando atendimento, Sendo atendidos, Aguardando
  check-out, Com check-out, Agendados.
- **Periódicos**: lembretes de retorno/vacina dos próximos 7 dias.
- **Contas a pagar**: documentos vencendo hoje.
- **Produtos com estoque baixo ou sem estoque**.
- **Aniversariantes**: abas PETS / CLIENTES, próximos 7 dias.

## 3. Atendimento — 5 visualizações da mesma agenda

Barra superior: Atualizar · seletor de mês · Hoje · calendário ·
**Dia / Semana / Mês** · **Atendimentos | Kanban | Calendário | Atividades** ·
Filtros · Filtros avançados · tela cheia.

Filtros rápidos: Pet/Cliente, Profissional, Situação.

### 3.1 Lista (Atendimentos)
Tabela agrupada por data ("01/07/2026 - quarta-feira (1)"), colunas:
checkbox, Horário, Pet | Cliente, Detalhes (serviço + contador tipo "(1/2)"),
Profissional, Valor, Situação. A **situação é um dropdown colorido na própria
linha** (Check-out verde, Pronto roxo, Cancelado vermelho, Check-in azul) —
muda o status sem sair da lista. Ícones de ação: localização (leva e traz),
transferência, menu de três pontos.
Marcações extras na linha: "Busca e Entrega", "Apenas Busca", avisos em
vermelho (ex.: "PET de plano - adicional escovação de dente").

### 3.2 Kanban
Colunas por status com contador: **Agendado (2) · Check-in (7) · Pronto (1) ·
Check-out (9) · Cancelado (1)**. Cada cartão traz: número do atendimento
(#834), ícones de alerta/observação, horário, data, **foto do pet**, nome do
pet (espécie/raça), tutor, profissional ("Sem profissional") e etiquetas
("Busca e Entrega"). Cartões arrastáveis entre colunas.

### 3.3 Calendário
Visão de grade por dia/semana/mês.

### 3.4 Atividades
Lista por serviço executado (não por atendimento): Horário, Serviço,
Pet/Cliente, Profissional, Situação (Feito / Agendado). Alterna Lista/Kanban.
Ícones de informação com tooltip (ex.: "Pet chegou atrasado").

## 4. Ficha de atendimento / prontuário

Cabeçalho: número do atendimento, **Profissional responsável**, **Leva e traz**,
foto do pet, dados (espécie, idade calculada em anos/meses/dias, gênero, peso
com data da última pesagem + "Novo peso", box de internação), etiquetas de
comportamento ("Brincalhão", "Dócil"), tutor e um painel **Financeiro** com
saldo do cliente (débito/crédito) e histórico de datas.

Barra de ações: Imprimir · Auditoria · Imp. Orçamento · **Agendar Retorno** ·
Formulários · **Req. Exames** · **Ir para internação** · Vincular ao Plano ·
Adicionar Item · Novo Adiantamento. Status do atendimento em dropdown no canto
(Agendado) com menu: **Análise do histórico clínico** e **Transcrição de Consulta**.

Abas: **Itens · Clínica · Insumos**.
Prontuário com barra de ícones (vacinas, exames, imagens, anexos, receitas,
compartilhar…). Painel lateral direito com abas **Histórico · Vacinas ·
Vermífugos · Antiparasitários** e o Histórico Clínico com registros por
atendimento (Anamnese, Exame Físico Inicial etc.).

## 5. IA "Nina" — o grande diferencial deles

Mascote raposa laranja. Aparece em vários pontos:

1. **Análise do histórico clínico**: varre todos os atendimentos anteriores do
   pet (barra de progresso por atendimento + "Revisão final") e devolve, na
   ficha do pet, um painel por data com: **Recomendações da Nina** (com selo
   "Avalie com cautela" e links "detalhes"/"fonte"), Condições prévias
   relevantes, **Riscos e alertas**, Sinais clínicos, Tratamentos — cada bloco
   com contador de registros.
2. **Transcrição de consulta por IA**: enviar arquivo de áudio OU gravar a
   consulta ao vivo. Requer veterinário responsável com a função liberada.
   A IA devolve blocos editáveis, cada um com botão **"Salvar no atendimento"**:
   Dados do Pet (com alerta de alergia em vermelho), Queixa Principal,
   Anamnese, Procedimentos, Exames, Notas, Prescrições, Diagnóstico,
   Prognóstico, **Anotações sobre Sugestões e Alertas**, Avisos. Também há
   "Salvar TUDO no atendimento".
3. **Análise de relatório**: dentro do visualizador de PDF de qualquer
   relatório, um chat lateral ("Nina IA — Análise e insights do relatório")
   responde perguntas em linguagem natural sobre aquele relatório
   (ex.: "qual cliente com maior saldo devedor? qual o total da dívida?").
4. Avisos de responsabilidade profissional antes de usar (checkbox
   "Estou ciente") — cuidado jurídico que devemos copiar.

Liberação por profissional: no cadastro do profissional há a seção
**"Liberação da Assistente Veterinária"** com toggles (Transcrição por IA,
IA gravação, IA teleconsulta).

## 6. Cadastro de profissional

Tipo pessoa, Nome, CPF, RG, Data de nascimento, Sexo · **Endereço com busca
por CEP** (CEP com lupa, Endereço, Número, Complemento, Bairro, Cidade,
Proximidade) · Contatos (Telefone com Tags, E-mail, ambos com botão "+" para
múltiplos) · Informações do Profissional: **Funções** (checkboxes Veterinário,
Vendedor, Banhista), **Perfil de Comissão**, **CRMV**, **Assinatura em imagem**
(upload PNG) · Observação · Liberação da Assistente Veterinária.

## 7. Configurações → Campos obrigatórios (muito bom)

Tela "Campos obrigatórios — Defina quais campos são obrigatórios para cada tipo
de cadastro", com abas: **CLIENTE (28 campos) · PET (13) · FORNECEDOR (24) ·
PROFISSIONAL (32) · PRODUTO (30) · SERVIÇO (24) · PLANO (18)**.

- Cada campo tem toggle **Obrigatório (completo)** e **Obrigatório (resumido)**
  — dois níveis de exigência (cadastro rápido vs. completo).
- Campos agrupados por seção (Identificação, Complementar, Endereço,
  Detalhes do Produto…).
- **Renovação de cadastro em dias** por tipo (ex.: cliente 5, pet 90) com botão
  Atualizar ou "Não controlar renovação": o sistema avisa quando o cadastro
  está velho e pede confirmação dos dados no atendimento — abre um painel
  lateral "Atualizar Cadastro do Cliente" no meio do fluxo.

## 8. Relatórios

Padrão: tela de filtros → botão Visualizar/Limpar → visualizador de PDF em
modal com zoom, busca no documento, paginação, seletor de formato (PDF) e o
chat da Nina ao lado.

- **Relatório de Insumos**: Período de Análise, Tipo de Origem
  (Atendimento/Internação/Todos), **Tipo de Relatório (Detalhado, Resumido,
  Profissional, Por Produto)**, filtros de Grupo, Subgrupo, Marca, Produto,
  Cliente/Paciente, Profissional, Grupo de Cliente. Saída com colunas
  Atend., Tipo, Data, Prof. Resp., Usu. Lanç., Insumo, Qtd, Custo, Valor.
- **Relatório de Contas a Receber**: rádios (Vencidos e a vencer / Somente a
  vencer / Somente vencidos / Por período de data), Data utilizada para filtro,
  Período de Vencimento, Cliente, Grupo de Cliente, Tipo de Documento,
  Profissional, Previsão, **Agrupamento** (Por Data), **Tipo de Impressão**
  (Completo). Saída agrupada por vencimento com Valor Doc., Vlr. Aberto,
  Multa, Juros, Vlr. Líquido e totais por data.

## 9. O que o VetHub precisa para empatar

- [ ] Kanban de atendimentos arrastável + visões Dia/Semana/Mês/Calendário
- [ ] Mudança de status direto na linha da lista (dropdown colorido)
- [ ] Foto do pet e do cliente
- [ ] Peso com histórico e data da última pesagem; idade em anos/meses/dias
- [ ] Etiquetas/tags de comportamento e de serviço (busca e entrega etc.)
- [ ] Saldo financeiro do cliente na ficha (débito/crédito, adiantamento)
- [ ] Agendar retorno, requisição de exames, formulários
- [ ] Internação com box
- [ ] Vacinas / vermífugos / antiparasitários com controle de periodicidade
- [ ] Campos obrigatórios configuráveis por tipo de cadastro + renovação
- [ ] Comissão por profissional, CRMV, assinatura digital
- [ ] Relatórios com filtros ricos e exportação PDF
- [ ] Planos/assinaturas recorrentes
- [ ] Notas fiscais (NF-e/NFS-e)

## 10. Onde o VetHub pode ser MELHOR

- **WhatsApp nativo e oficial** (Embedded Signup já pronto) — a Peti9 não
  mostra automação de WhatsApp nos prints; nosso chatbot que agenda sozinho é
  diferencial de venda.
- **Visual**: eles usam interface clara e densa, com tabelas cinza. Nosso
  glassmorphism sobre o degradê da marca é muito mais moderno.
- **Mobile real**: os prints são todos desktop; nosso app é mobile-first com
  dock de navegação — vet atende com o celular na mão.
- **IA além do prontuário**: além de transcrição e análise de histórico
  (que precisamos ter), dá para usar IA em triagem por WhatsApp, resumo do
  dia para o dono da clínica e sugestão de reagendamento.
- **Preço e transparência**: definir planos claros no site (ver
  `docs/precificacao.md` quando existir).
- **Onboarding**: clínica ativa em minutos, sem implantação paga.

## 11. Pendências de levantamento

- [ ] Preços dos planos da Peti9 e dos concorrentes (Simples Vet, Vetus,
      ClinicVet, Vetsoft, Provet Cloud)
- [ ] Módulos ainda não vistos: Marketing, Compras, Notas Fiscais,
      Integrações, Financeiro completo, Estoque, PDV, Banho e tosa
- [ ] Fluxo de plano/assinatura e de teleconsulta
