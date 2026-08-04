# Mercado brasileiro de software de gestão veterinária — inteligência competitiva

> Levantamento feito em **04/08/2026** por pesquisa web nos sites oficiais, páginas de
> preços, documentos do CFMV/Sebrae/MAPA e reputação pública.
> Complementa `docs/concorrentes/peti9.md` (análise funcional da Peti9 a partir de
> prints do sistema) — aqui o foco é **preço, mercado e posicionamento**.

**Regra de leitura:** todo número marcado como "confirmado" foi lido na fonte oficial
na data acima. O que está como "estimativa" ou "não confirmado" **não deve ser usado
como fato** em material de venda sem nova checagem.

---

## 1. Sumário executivo — o que importa

1. **O mercado está consolidando na mão da Petlove.** A Petlove já comprou o Vetus
   (2020), a Provet (diagnósticos), a NoFaro (planos de saúde pet), o Vet Smart
   (prescrição) e anunciou a compra da **SimplesVet em 11/06/2025**, declarando meta de
   *quintuplicar a base da SimplesVet em dois anos*. Ou seja: os três maiores nomes que
   um veterinário cita — SimplesVet, Vetus e Vet Smart — hoje são **do mesmo dono**.
2. **A Peti9 não publica preço.** Não existe página `/planos` ou `/precos` no site, e
   nenhum valor em R$ aparece em nenhuma página pública. Os termos de uso confirmam que
   ela **cobra implantação à parte da mensalidade** — no sentido oposto de todo o resto
   do mercado, que hoje anuncia "sem taxa de implantação" como argumento de venda.
3. **O mercado precifica por usuário, e aperta.** O Vetus dá só **2 usuários** em todos
   os três planos (R$ 229,89 a R$ 287,39). A SimplesVet começa em 3 usuários por
   R$ 359. Esse é o ponto de dor mais explorável.
4. **"Preço de tabela" ≠ preço real.** Internação, módulo fiscal e mensagens são cobrados
   à parte na maioria. Uma clínica pequena na SimplesVet que precise de internação e
   NF-e paga **R$ 648/mês**, não R$ 359.
5. **IA de prontuário está virando item de prateleira.** Peti9 (Nina), Vet Smart
   (gravação de consulta por IA) e VetBase ("Doutor Basinho", plano de R$ 299) já
   entregam. Não é mais diferencial — é **requisito de paridade**.
6. **WhatsApp oficial ainda é diferencial real.** A SimplesVet só abre "WhatsApp Web pelo
   sistema" e cobra **R$ 0,50 por mensagem automática**. A Vetwork cobra **R$ 179,90/mês**
   à parte pelo chatbot de IA. Ninguém no meio do mercado entrega API oficial da Meta com
   bot que agenda sozinho dentro do plano.
7. **O custo marginal do WhatsApp pode ser quase zero** se o fluxo for desenhado para
   responder dentro da janela de 24 horas — a Meta confirma que *templates de utilidade
   entregues dentro de uma janela de atendimento aberta são gratuitos*.
8. **A Vetus tem reputação ruim e é a base mais atacável do mercado:** nota **3,15** no
   Reclame Aqui, **30,8%** de recompra, resposta média em **7 dias e 14 h** — contra 7,3
   e 80% da SimplesVet, sua irmã dentro do mesmo grupo. São milhares de clínicas
   insatisfeitas, pagando R$ 229–287 por apenas **2 usuários**, num produto legado.
   **É o alvo de aquisição de clientes número 1 do VetHub.**

---

## 2. Tabela comparativa de preços

Todos os valores abaixo foram lidos nas páginas oficiais em **04/08/2026**, salvo onde
marcado. Preços mensais, sem desconto anual.

| Concorrente | Plano | Preço/mês | Limite de usuários | Módulos inclusos | Taxa de implantação | Observações |
|---|---|---|---|---|---|---|
| **Peti9** | Não publicado | **Sob consulta** | Não publicado | Agenda, prontuário, internação, estoque, PDV, financeiro, NF-e/NFC-e/NFS-e, marketing, compras, IA "Nina" | **Cobra — valor "independente das mensalidades"** (termos de uso) | Sem página de preços. Declara 12.000+ usuários ativos, 26 estados, 10+ anos. Não verificada no Reclame Aqui |
| **SimplesVet** (Petlove) | Clínica e Hospital | **R$ 359** | 3 | Prontuário, agenda, PDV, estoque, financeiro, comissões, portal do tutor, NFS-e | Nenhuma | Internação **+R$ 136**; Fiscal ilimitado **+R$ 153**; mensagens **R$ 0,15–0,50 cada** |
| | Clínica e Hospital | R$ 389 | 5 | idem | Nenhuma | |
| | Clínica e Hospital | R$ 440 | 10 | idem | Nenhuma | |
| | Clínica e Hospital | R$ 549 | 15 | idem | Nenhuma | |
| | Clínica e Hospital | **R$ 979** | Ilimitado | idem | Nenhuma | |
| | Pet shop Avançado | R$ 220 | 5 (fixo) | PDV, estoque, comissões, fiscal ilimitado | Nenhuma | **Sem nenhuma funcionalidade veterinária** |
| | Pet shop Básico | R$ 157 | 3 (fixo) | PDV, agenda, estoque, contas a pagar | Nenhuma | Limite de **80 notas/mês** |
| **Vetsoft Web** | Gratuito | **R$ 0** | 1 | Todas as funcionalidades, até 30 animais, 1 GB | Nenhuma | Sem prazo de expiração |
| | Inicial | **R$ 140** | 1 | **Todas as funcionalidades** | Nenhuma | Migração de dados **sem custo** |
| | Dupla | R$ 217 | 2 | Todas | Nenhuma | |
| | Trio | R$ 261 | 3 | Todas | Nenhuma | |
| | Equipe | R$ 315 | 5 | Todas | Nenhuma | "Mais popular" |
| | Clínica | R$ 401 | 10 | Todas | Nenhuma | |
| | Avançado | R$ 435 | 15 | Todas | Nenhuma | |
| | Ilimitado | **R$ 860** | Ilimitado | Todas | Nenhuma | Complementos à parte: Internação **R$ 97**, Emissão Fiscal **R$ 97 por tipo**, Exames **R$ 30**, Dermograma |
| **Vetus** (Petlove) | Essencial | **R$ 229,89** | **Até 2** | Cadastros, relatórios, agenda de serviços, contas a pagar/receber | Não informado | Multi-filial **+R$ 129,90**; Pacote fiscal **+R$ 149,90** |
| | Avançado | R$ 252,89 | **Até 2** | + múltiplos estoques, comissões, esteira de atendimento, tabela de preços, fidelização | Não informado | |
| | Completo | **R$ 287,39** | **Até 2** | + laboratório, esteira de exames, **internação**, gestão de fila, DRE, gestão de vacinas | Não informado | Anunciado como "a partir de" — usuário extra não tem preço público |
| **Vetwork** | Volante | **R$ 119,90** | 1 | Agenda, clientes/pets, atendimento clínico básico | Nenhuma | 7 dias grátis, sem fidelidade |
| | Inicial | R$ 179,90 | 3 | + banho e tosa, estoque, financeiro | Nenhuma | |
| | Profissional | R$ 259,90 | 5 | + clínico completo, lembretes WhatsApp, 100 NFC-e/mês | Nenhuma | |
| | Avançado | **R$ 399,90** | 20 | + multi-caixa, internação, fiscal ilimitado | Nenhuma | Add-ons: Fiscal **R$ 70/tipo**, WhatsApp **desde R$ 50**, **Chatbot IA desde R$ 179,90**, receituário digital R$ 20/usuário, TEF desde R$ 99,90, banho e tosa avançado R$ 50, multi-unidade R$ 119,90, internação R$ 119,90 |
| **VetBase** | Essencial | **R$ 99** | 1 | Prontuário, vacinas, exames, agenda clínica e banho/tosa, estoque, financeiro, PDV | Nenhuma | Declara 4.800+ usuários |
| | Pro | R$ 199 | 5 | + WhatsApp, internação, múltiplas agendas, exportação, modelos | Nenhuma | |
| | Max | **R$ 299** | Ilimitado | + **assistente de IA "Doutor Basinho"**, alertas de vacina, comissões, fila, gaveta de caixa | Nenhuma | |
| **VetSuite** | Free | R$ 0 | 3 | Cadastros, 70 operações/mês, 5 GB | Não informado | |
| | Petshop | **R$ 79,90** | 10 | Agenda banho e tosa, mini-loja, 15 GB | Não informado | Excedentes: serviço R$ 0,25–0,35, **interação de IA R$ 0,12**, GB R$ 3,90 |
| | Master | R$ 120 | 10 | + mini-loja ilimitada, 50 GB, 500 operações/mês | Não informado | |
| | Pro | R$ 250 | Ilimitado | + 100 GB, 1.000 operações/mês, suporte premium | Não informado | |
| **Fourpet** | Groomer | **R$ 59** | 1 | Agenda, banho e tosa | Nenhuma no plano base | |
| | Pet Shop | R$ 89 | 5 | + loja integrada | Nenhuma no plano base | |
| | Clínicas | R$ 159 | Não informado | + atendimento clínico | Nenhuma no plano base | |
| | Pet Shop + PDV Fiscal | R$ 239 | Não informado | + frente de caixa fiscal | **R$ 299 única, só do módulo fiscal** | + **R$ 0,99 por NFS-e emitida** |
| **GoVet** | Básico | **R$ 19,90** | 1 | Agenda, prontuário, vacinas, laudos, financeiro | Nenhuma | Sem fidelidade |
| | Avançado | **R$ 24,90** | 1 | + **"Vety IA", assistente no WhatsApp** que registra, agenda e cobra | Nenhuma | Preço de entrada agressivo, mas só veterinário autônomo |
| **Vet Smart** (Petlove) | Prontuário Básico | R$ 0 | 1 | 150 cadastros, 150 prontuários/mês | Nenhuma | |
| | Prontuário Pro | **R$ 49,90** (mensal) / R$ 39,90 (anual) | Não informado | + insumos, serviços, vendas, fluxo de caixa, contas a receber, painel; **gravação de consulta por IA** | Nenhuma | Preços de fonte secundária (central de ajuda citada em busca) — **não confirmado** na página oficial |
| **Provet Cloud** | Core | **USD 99 / veterinário / mês** | 1 vet (equipe de apoio grátis) | PIMS internacional completo | Não informado | **Não confirmado em fonte primária** — valores de agregadores (SaaSworthy, VetSoftwareHub). ≈ R$ 515/vet a USD 1 = R$ 5,20 |
| | Pro | USD 129 / veterinário / mês | 1 vet | + recursos avançados | Não informado | idem |
| **Nuvem Vet / VetPlus / Loopvet / ZettaPET / Dvet / PetVet Sistemas** | — | **Sob consulta** | — | — | — | Não publicam tabela. Loopvet publica só add-ons: Fiscal R$ 97,90, Assinatura digital R$ 29,90, **WhatsApp grátis** |

**Nota sobre "Zap Vet":** a busca por esse nome retorna **clínicas veterinárias**
(zapvet.com.br e similares), não software. Não é concorrente. Os concorrentes reais de
nicho em WhatsApp/agendamento são **AgendaIA**, **Atendente24h** (R$ 197 / R$ 397 /
R$ 797 por mês, valores de fonte secundária, **não confirmados**), **Chat Inteligente**
e o **chatbot da própria Vetwork** (R$ 179,90/mês).

---

## 3. Tabela de funcionalidades

Legenda: **S** = incluso no plano principal · **$** = existe, mas é módulo pago à parte ·
**—** = não encontrado / não oferecido · **?** = não confirmado

| Funcionalidade | Peti9 | SimplesVet | Vetsoft | Vetus | Vetwork | VetBase | GoVet | Vet Smart |
|---|---|---|---|---|---|---|---|---|
| Agenda / agendamento | S | S | S | S | S | S | S | S |
| Prontuário clínico | S | S (só Clínica) | S | S | S | S | S | S |
| Kanban de atendimento | S | ? | ? | S (esteira) | ? | S (fila) | — | — |
| Internação | S | **$** R$ 136 | **$** R$ 97 | S (só Completo) | **$** R$ 119,90 | S (Pro) | — | — |
| Estoque | S | S | S | S (múltiplos no Avançado) | S | S | S | S (Pro) |
| PDV / frente de caixa | S | S | S | S | S | S | — | S (Pro) |
| Financeiro / fluxo de caixa | S | S | S | S | S | S | S | S (Pro) |
| NF-e / NFC-e / NFS-e | S | **$** R$ 153 | **$** R$ 97 por tipo | **$** R$ 149,90 | **$** R$ 70 por tipo | ? | — | — |
| WhatsApp (envio automático) | S (lembretes de vacina) | **$** R$ 0,50/msg, **WhatsApp Web** | ? | ? | **$** desde R$ 50 | S (Pro) | S | — |
| WhatsApp API oficial + bot que agenda | — | — | — | — | **$** R$ 179,90 | — | S (Vety IA) | — |
| IA (prontuário / transcrição) | **S — "Nina"** | — | — | — | **$** (chatbot) | S (só Max) | S | S |
| App mobile | ? (prints só desktop) | ? | S (acessa como app) | S (Vetus Mobile) | ? | ? | S (WhatsApp) | ? |
| Banho e tosa | S | S | S (estética) | S | S / **$** avançado R$ 50 | S | — | — |
| Planos / assinaturas recorrentes | S | S (pacotes e kits) | S (pacotes) | S (fidelização) | S (pacotes) | ? | — | — |
| Teleconsulta | ? (toggle "IA teleconsulta") | — | — | — | — | — | — | — |
| Multi-unidade / multi-filial | S | — | ? | **$** R$ 129,90 | **$** R$ 119,90 | ? | — | — |
| Portal / área do tutor | ? | S | S | ? | ? | ? | — | — |
| Laboratório / exames | S | S | **$** R$ 30 | S (só Completo) | ? | S | S (laudos) | — |
| Comissões | S | S | S | S (Avançado+) | ? | S (Max) | — | — |
| Plano gratuito permanente | — | — | **S** | — | — | — | — | **S** |

**Leitura da tabela:** o Vetsoft é o único que entrega **todas as funcionalidades em
todos os planos pagos** e cobra puramente por número de usuários — é o modelo mais
honesto do mercado e o benchmark de transparência a bater. A SimplesVet e a Vetus são as
que mais fatiam módulos. E **ninguém** tem teleconsulta de verdade, apesar de a
Resolução CFMV nº 1.465/2022 já regulamentar a telemedicina veterinária desde
01/07/2022 (com exigência de relação prévia presencial registrada em prontuário).

---

## 4. Análise do mercado

### 4.1 Tamanho e número de estabelecimentos

Todos os números abaixo são de **fonte primária**, salvo indicação.

| Indicador | Número | Fonte / data |
|---|---|---|
| Clínicas veterinárias | **34.639** | CFMV, relatório de 19/06/2026 |
| Hospitais veterinários | **1.453** | idem |
| Consultórios veterinários | **10.317** | idem |
| Ambulatórios | **173** | idem |
| **Total de estabelecimentos veterinários** | **46.582** | soma das linhas acima (cálculo próprio) |
| Pet shops registrados no CRMV | **17.225** | idem |
| Pet shops ativos (CNAE 9609-2/08) | **41.725** | Sebrae/PR |
| Empresas do setor pet no Brasil | **217.498** | Receita Federal via Sebrae |
| Médicos veterinários **atuantes** | **228.167** | CFMV, 19/06/2026 |
| Médicos veterinários registrados (acumulado) | 300.005 | idem |
| População de pets | **160,9 milhões** (3º do mundo) | Abempet, 2024 |

> **Ressalva importante:** o relatório do CFMV cobre **26 das 27 UFs — Minas Gerais está
> ausente**. O total real de estabelecimentos é **maior** que 46.582. São Paulo sozinho
> tem 15.018 clínicas, 428 hospitais e 2.427 consultórios.

**Mercado endereçável (TAM) do VetHub:** entre **46,6 mil e ~64 mil** estabelecimentos
(estabelecimentos veterinários + pet shops com responsável técnico), sem contar MG.

### 4.2 Faturamento do setor

| Indicador | Valor | Fonte |
|---|---|---|
| Faturamento do setor pet (projeção 2025) | **R$ 77,33 bilhões** | Abempet / MAPA, 30/10/2025 |
| Crescimento sobre 2024 (R$ 75,40 bi) | +2,6% | idem |
| **Canal "Clínicas e Hospitais Veterinários"** | **R$ 13,53 bilhões — 17,5% do setor** | idem |
| Canal "Pet Shops (pequeno e médio)" | R$ 37,20 bi — 48,1% | idem |
| Crescimento de Serviços em 2025 | +7% | idem |
| Crescimento do mercado veterinário em 2025 | +5% | idem |
| Série histórica | 2013 R$ 24,3 bi → 2020 R$ 40,9 bi → 2023 R$ 68,7 bi → 2025 R$ 77,3 bi | idem |

Faturamento médio por estabelecimento veterinário: R$ 13,53 bi ÷ 46.582 ≈ **R$ 290 mil/ano
≈ R$ 24 mil/mês** — **estimativa própria**, ordem de grandeza. Não existe dado publicado
de faturamento médio de clínica veterinária em fonte primária; blogs comerciais citam
R$ 15–40 mil/mês, **sem fonte** — não usar.

### 4.3 Perfil do cliente

| Característica | Dado | Fonte |
|---|---|---|
| Micro e pequenas empresas | **98% do setor pet** | Sebrae / Receita Federal |
| MEIs | 111.922 negócios pet | idem |
| Novos negócios pet abertos 2023–2025 | 41.600 (+22%), **~91% MEIs** | Agência Sebrae, 06/02/2026 |
| Empregados no setor | 164.983 (93,5% em micro e pequenas) | Sebrae |
| Média de empregados por empresa | ≈ 0,76 | cálculo próprio |
| Mortalidade em 3 anos | **36,89%** (idade média das encerradas: 1,7 anos) | Sebrae |
| Idade média das empresas vivas | 5,6 anos | idem |
| Pet shops PR no Simples Nacional | 96% | Sebrae/PR (recorte estadual) |

**O que isso significa na prática.** O cliente típico **não é** um hospital com 15
usuários. É uma clínica ou consultório de **1 a 4 pessoas**, no Simples Nacional, dono
operando junto, com faturamento na casa de dezenas de milhares por mês e **alta chance de
fechar antes de completar 2 anos**. Três consequências diretas para o VetHub:

1. **Sensibilidade a preço é altíssima** e a mensalidade compete com o pró-labore do dono.
2. **Onboarding tem de ser instantâneo.** Quem tem 0,76 empregado por empresa não tem
   quem passe uma semana em implantação — e muito menos quem pague por ela.
3. **Churn estrutural é alto** por mortalidade das empresas, não por insatisfação. O
   modelo tem de suportar isso: sem fidelidade, mas com plano anual descontado para
   ancorar quem sobrevive.

Existe uma segunda persona, minoritária mas valiosa: **1.453 hospitais** e as redes
multi-unidade, que precisam de internação, laboratório, multi-filial e usuários
ilimitados. É onde o ticket sobe de R$ 300 para R$ 900+.

### 4.4 Dores comuns relatadas

Reputação pública levantada em 04/08/2026:

| Empresa | Reclame Aqui | Observação |
|---|---|---|
| **SimplesVet** | Nota **7,3**; **17 reclamações**; 100% respondidas; **70% resolvidas**; **80% voltariam** a fazer negócio; tempo médio de resposta **1 dia e 16 h**; empresa **verificada** | Volume baixo para 8.200 clientes — reputação sólida |
| **Vetus** (Petlove) | Nota **3,15**; **40 reclamações** (13 avaliadas); 100% respondidas; 76,9% resolvidas; **apenas 30,8% voltariam** a fazer negócio; tempo médio de resposta **7 dias e 14 h** | **Reputação claramente ruim.** Maioria das queixas classificada como **mau atendimento / SAC**. Há caso público de **bloqueio do sistema mesmo com pagamento em dia** |
| **Vetsoft** | Sem 10 reclamações avaliadas — reputação não calculável | Volume baixo |
| **Peti9** | **Não se aplicou ao processo de verificação**; sem reclamações listadas | O RA avisa que "não pode assegurar que a empresa existe ou é confiável" — ausência de dados, não atestado de qualidade |

**O contraste Vetus × SimplesVet é o achado mais explorável desta seção:** as duas são do
mesmo dono (Petlove), e a Vetus tem **nota 3,15 com 30,8% de recompra e resposta em mais
de 7 dias**. Isso indica um produto legado mal atendido dentro do grupo — e uma base de
clientes insatisfeita, identificável e abordável.

Temas recorrentes nas reclamações e avaliações encontradas:

1. **Atendimento e suporte ruins** — categoria dominante das reclamações contra a Vetus,
   com tempo médio de resposta de mais de uma semana. É a dor nº 1 do setor.
2. **Bloqueio de acesso ao sistema** — caso público de cliente adimplente com o sistema
   bloqueado. Como o software é o coração operacional da clínica, bloqueio indevido é a
   falha mais grave possível em termos de confiança.
3. **Promessa comercial não cumprida** — desconto prometido na venda que não aparece na
   fatura. Reclamação mais citada contra a SimplesVet.
4. **App mobile fraco** — o aplicativo da SimplesVet tem **3,5 de 5 na Google Play**, com
   usuários relatando erros e impossibilidade de acessar exames. *Confirma a hipótese de
   `peti9.md`: mobile é o ponto fraco geral do mercado.*
5. **Relatórios incompletos** — dados faltando ao exportar para Excel; conciliação
   bancária limitada.
6. **Falta de treinamento adequado** na implantação.
7. **Sem integração com e-commerce** — apontado como desvantagem da SimplesVet frente a
   ERPs horizontais.
8. **Taxa de implantação cobrada antes de o cliente testar** — dor tão reconhecida que
   virou argumento de marketing de vários fornecedores, que anunciam "sem taxa de
   implantação, sem contrato" como manchete (VetBase, Vetwork, PetVet Sistemas,
   Nuvem Gestor). **A Peti9 está do lado errado dessa linha.**
9. **Preço opaco** — Peti9, Nuvem Vet, VetPlus, Loopvet, ZettaPET e Dvet não publicam
   tabela. O comprador precisa falar com vendedor para saber quanto custa.
10. **Custo real acima do anunciado** — internação, fiscal e mensagens cobrados à parte
    fazem o valor de tabela virar propaganda enganosa na percepção do cliente.
11. **Migração de dados como armadilha de fidelidade** — a SimplesVet declara "sem
    contrato de fidelidade, **exceto** casos com migração de dados (mínimo 3 meses)".

> **Ressalva de método:** o volume de reclamações públicas nesse setor é pequeno — 40 na
> Vetus e 17 na SimplesVet — e **não constitui amostra estatisticamente relevante**. Os
> temas 1–7 vêm de um número reduzido de casos e de avaliações de loja de aplicativos;
> os temas 8–11 são inferidos do **posicionamento de marketing dos próprios concorrentes**
> (o que eles atacam revela a dor que o cliente sente). Tratar tudo como hipótese a
> validar em entrevistas com veterinários, não como pesquisa quantitativa.

### 4.5 Consolidação: o elefante na sala

| Ativo | Ano de aquisição pela Petlove |
|---|---|
| Vetus (gestão) | 2020 |
| Provet (diagnósticos veterinários) | — |
| NoFaro (planos de saúde pet) | — |
| Vet Smart (prescrição / prontuário) | — |
| **SimplesVet (gestão)** | **anunciada em 11/06/2025** |

A Petlove declarou meta de **quintuplicar a base de clientes da SimplesVet em dois anos**.
Isso significa duas coisas para o VetHub: (a) haverá **pressão comercial agressiva** no
mercado nos próximos anos; (b) abre-se espaço para um posicionamento de
**independência** — muita clínica não quer entregar sua base de clientes ao maior
e-commerce pet do país, que é simultaneamente seu concorrente na venda de produtos e em
planos de saúde pet. **Isso é uma objeção de venda pronta e é ouro.**

---

## 5. Faixas de preço praticadas

Consolidando apenas os preços **confirmados em fonte oficial**:

| Faixa | Preço/mês | Quem está aqui | Perfil atendido |
|---|---|---|---|
| **Gratuito / isca** | R$ 0 | Vetsoft Gratuito (1 usuário, 30 animais), Vet Smart Básico, VetSuite Free | Estudante, recém-formado |
| **Entrada** | **R$ 20 – 120** | GoVet (R$ 19,90–24,90), Fourpet Groomer (R$ 59), VetSuite Petshop (R$ 79,90), VetBase Essencial (R$ 99), Vetwork Volante (R$ 119,90), Vetsoft Inicial (R$ 140 — 1 usuário) | Veterinário autônomo, consultório de 1 pessoa |
| **Média — o coração do mercado** | **R$ 150 – 400** | SimplesVet Pet shop (R$ 157–220), Vetwork Inicial/Profissional (R$ 179,90–259,90), VetBase Pro (R$ 199), Vetsoft Dupla a Equipe (R$ 217–315), Vetus (R$ 229,89–287,39), VetBase Max (R$ 299), SimplesVet Clínica 3–5 usuários (R$ 359–389), Vetwork Avançado (R$ 399,90) | **Clínica de 2 a 6 pessoas — a persona dominante** |
| **Premium** | **R$ 400 – 1.000** | Vetsoft Clínica/Avançado (R$ 401–435), SimplesVet 10–15 usuários (R$ 440–549), Vetsoft Ilimitado (R$ 860), SimplesVet Ilimitado (R$ 979) | Hospital, rede multi-unidade |
| **Custo real com módulos** | **até ~R$ 1.270** | SimplesVet Ilimitado + Internação + Fiscal = R$ 979 + 136 + 153 | Hospital que precisa de tudo |

**Referência externa — o que a PME brasileira já paga por ERP** (páginas oficiais,
04/08/2026): Tiny/Olist R$ 55, Bling R$ 60, Conta Azul R$ 159,90, Nibo R$ 166, Omie
R$ 309, eGestor R$ 309,90. **Faixa de entrada R$ 55–310, mediana ≈ R$ 163** (cálculo
próprio). Ou seja: o software veterinário **já cobra acima da média do ERP horizontal
brasileiro** — há disposição a pagar por verticalização, mas o teto psicológico do
pequeno negócio brasileiro fica em torno de **R$ 300/mês**.

### O custo real que o concorrente não mostra

Comparação de uma **clínica pequena com 3–5 usuários que precisa de internação e nota
fiscal** — o caso mais comum:

| Concorrente | Base | Internação | Fiscal | **Total real/mês** |
|---|---|---|---|---|
| SimplesVet (3 usuários) | R$ 359 | +R$ 136 | +R$ 153 | **R$ 648** |
| Vetsoft Equipe (5 usuários) | R$ 315 | +R$ 97 | +R$ 97 (1 tipo) | **R$ 509** |
| Vetwork Profissional (5 usuários) | R$ 259,90 | +R$ 119,90 | +R$ 70 | **R$ 449,80** |
| Vetwork Profissional + chatbot IA | R$ 259,90 | +R$ 119,90 | +R$ 70 + R$ 179,90 | **R$ 629,70** |
| Vetus Completo (2 usuários) | R$ 287,39 | incluso | +R$ 149,90 | **R$ 437,29** (e só 2 usuários) |
| VetBase Max (ilimitado, com IA) | R$ 299 | incluso | ? | **R$ 299+** |

**Essa é a tabela para colocar no site do VetHub.**

---

## 6. Recomendação de precificação para o VetHub

### 6.1 Princípios

1. **Preço público na home.** Metade do mercado esconde. Publicar é diferencial imediato,
   gera tráfego orgânico e elimina o atrito de "fale com um consultor".
2. **Zero taxa de implantação, sempre.** É o ataque direto à Peti9 e alinha com o que o
   resto do mercado já anuncia.
3. **Nada de fatiar internação e fiscal.** O cliente sente como pegadinha. Cobrar por
   **usuário** (modelo Vetsoft) e por **consumo de IA**, não por módulo.
4. **Sem fidelidade**, com desconto anual de 2 meses (≈16%) para ancorar caixa.
5. **Ser generoso em usuários.** É onde Vetus (2) e SimplesVet (3) machucam.

### 6.2 Os três planos propostos

| | **VetHub Início** | **VetHub Clínica** | **VetHub Hospital** |
|---|---|---|---|
| **Preço mensal** | **R$ 149** | **R$ 329** | **R$ 699** |
| **Preço anual (por mês)** | R$ 124 | R$ 274 | R$ 582 |
| **Usuários** | Até 3 | Até 8 | Ilimitados |
| **Para quem é** | Veterinário autônomo, consultório, clínica abrindo agora | **Clínica estabelecida de 2 a 8 pessoas — nosso alvo principal** | Hospital, clínica 24 h, rede multi-unidade |
| Agenda (lista, kanban, calendário) | S | S | S |
| Prontuário, vacinas, vermífugos | S | S | S |
| Clientes, pets, fotos, peso, histórico | S | S | S |
| PDV e financeiro completo | S | S | S |
| Estoque | S | S | S |
| Banho e tosa | S | S | S |
| App mobile | S | S | S |
| **WhatsApp oficial (API Meta)** — lembretes e confirmação | S — 300 mensagens/mês | S — 1.500 mensagens/mês | S — 5.000 mensagens/mês |
| **Bot de WhatsApp que agenda sozinho** | — | **S** | **S** |
| **IA de prontuário** (transcrição de consulta, resumo, análise de histórico) | — | **S — 60 consultas/mês** | **S — 250 consultas/mês** |
| **Internação** | — | **S — incluso** | S |
| **Fiscal (NFS-e / NFC-e / NF-e)** | — | **S — incluso** | S |
| Planos / assinaturas recorrentes | — | S | S |
| Comissões, CRMV, assinatura digital | — | S | S |
| Laboratório / esteira de exames | — | — | S |
| **Multi-unidade** | — | — | **S** |
| Teleconsulta (CFMV 1.465/2022) | — | — | S |
| Portal do tutor | S | S | S |
| Migração de dados | Gratuita | Gratuita | Gratuita + acompanhada |
| Suporte | Chat e WhatsApp | Chat e WhatsApp | Prioritário |
| **Taxa de implantação** | **R$ 0** | **R$ 0** | **R$ 0** |
| **Fidelidade** | Nenhuma | Nenhuma | Nenhuma |

**Excedentes** (não punitivos, só para cobrir custo variável):
consulta de IA além da cota **R$ 1,90**; mensagem de WhatsApp além da cota **R$ 0,12**;
usuário adicional **R$ 39/mês** no Início e Clínica.

Manter também um **teste grátis de 14 dias sem cartão** — é o padrão do mercado
(Vetsoft, SimplesVet, VetBase, Vetwork, Loopvet todos oferecem).

### 6.3 Por que esses números

**VetHub Início — R$ 149 (3 usuários).**
Fica acima do preço-isca do GoVet (R$ 24,90, mas 1 usuário só e sem gestão de verdade) e
do VetBase Essencial (R$ 99, 1 usuário), e **abaixo do Vetsoft Trio (R$ 261 para 3
usuários) e do Vetus Essencial (R$ 229,89 para apenas 2)**. É o melhor R$/usuário da
faixa de entrada: **R$ 49,67 por usuário**, contra R$ 114,95 do Vetus e R$ 87 do Vetsoft.
Não inclui IA porque a IA é o custo variável real — quem quer IA sobe de plano.

**VetHub Clínica — R$ 329 (8 usuários).**
Este é o plano que precisa vender. Contra o custo real do concorrente na mesma
necessidade (internação + fiscal): **R$ 648 na SimplesVet, R$ 509 no Vetsoft, R$ 449,80
na Vetwork**. O VetHub entrega o mesmo escopo **mais IA de prontuário e bot de WhatsApp**
por R$ 329 — economia de 27% a 49%, com uma mensagem simples: *"tudo incluso, sem
módulo escondido"*. Fica dentro do teto psicológico de R$ 300–350 do pequeno negócio
brasileiro e ainda assim quase 2× a mediana do ERP horizontal (R$ 163), justificado pela
verticalização e pela IA.

**VetHub Hospital — R$ 699 (ilimitado).**
Contra SimplesVet Ilimitado a R$ 979 + R$ 136 + R$ 153 = **R$ 1.268**, e Vetsoft
Ilimitado a R$ 860 + complementos. R$ 699 com tudo dentro é **45% mais barato que a
SimplesVet completa** e continua sendo um ticket alto e saudável. Também se compara bem
com o Provet Cloud (USD 99/veterinário — um hospital com 8 vets pagaria ~R$ 4.100/mês,
se os valores de fonte secundária estiverem corretos).

### 6.4 Margem e custo variável por cliente

**Custo do WhatsApp (Meta, WhatsApp Business Platform).**
Fatos confirmados na documentação da Meta:

- O modelo é **por mensagem entregue** desde **01/07/2025** (o modelo por conversa foi
  descontinuado). A cobrança depende da **categoria do template** (marketing / utilidade /
  autenticação) e do país do destinatário.
- **Mensagens de utilidade entregues dentro de uma janela de atendimento aberta são
  gratuitas.** A janela abre por 24 h quando o cliente escreve para o negócio.
- Mensagens livres (não-template) dentro da janela de 24 h: **gratuitas**.
- Anúncios click-to-WhatsApp e botão da Página do Facebook: **72 h gratuitas**.
- A antiga **cota de 1.000 conversas grátis/mês não existe mais**.
- A Meta **não cobra por número de telefone nem taxa fixa de plataforma**. Custo fixo, se
  houver, vem do BSP — usando a Cloud API direto, é zero.
- O faturamento em **BRL** começa a ser localizado a partir de **01/07/2026**.

**Preço por mensagem no Brasil: CONFIRMADO** nos rate cards oficiais da Meta (CSVs
baixados do CDN em 04/08/2026, vigência 01/07/2026). A Meta publica tabela **em BRL** —
sem conversão de câmbio. Detalhamento completo em [`docs/custos-whatsapp.md`](../custos-whatsapp.md).

| Categoria | USD/mensagem | **BRL/mensagem (oficial)** |
|---|---|---|
| Marketing | 0,0625 | **R$ 0,3217** |
| Utilidade (fora da janela) | 0,0068 | **R$ 0,0350** |
| Utilidade (dentro da janela de 24 h) | grátis | **R$ 0** |
| Autenticação | 0,0068 | **R$ 0,0350** |
| Resposta livre na janela de 24 h | grátis | **R$ 0** |

> Correção: as estimativas de 0,0080 (utilidade) e 0,0225 (autenticação) que circulam em
> blogs são do modelo antigo por conversa e estão obsoletas. O valor real é **0,0068** nas
> duas categorias — ou seja, o custo de mensageria é ainda **menor** do que o modelado.

> **Alerta de 01/10/2026:** a Meta passará a cobrar mensagens de atendimento (hoje
> gratuitas) e templates de utilidade dentro da janela de 24 h, à mesma tarifa de
> utilidade. As tarifas exatas saem até 01/09/2026. Isso **enfraquece parcialmente** a
> estratégia de janela abaixo — revisar a modelagem nessa data.

> **Consequência de produto, não de preço:** desenhar o fluxo para que o tutor **inicie**
> a conversa (link, QR code, anúncio click-to-WhatsApp) e responder dentro das 24 h
> **derruba o custo de mensageria para perto de zero**. Só lembretes proativos fora da
> janela e campanhas de marketing custam. Vale a pena investir engenharia nisso: é a
> diferença entre R$ 5 e R$ 80 de custo por cliente/mês.

**Custo da IA.** Transcrição de uma consulta de 15–20 min + geração do resumo:

| Componente | Opção mais barata | Custo por consulta |
|---|---|---|
| Transcrição (STT) | OpenAI `gpt-4o-mini-transcribe` a USD 0,003/min | USD 0,045–0,060 |
| Transcrição (alternativa pt-BR) | Deepgram Nova-3 Multilingual a USD 0,0092/min | USD 0,138–0,184 |
| Resumo / SOAP (LLM) | `gpt-5-mini` (USD 0,25 / 2,00 por 1M tokens) | ~USD 0,004 |
| Resumo / SOAP (qualidade) | Claude Haiku 4.5 (USD 1 / 5 por 1M tokens) | ~USD 0,013 |
| **Total por consulta** | | **USD 0,05 – 0,25 ≈ R$ 0,26 – 1,30** |

**A transcrição domina o custo, não o modelo de texto.** A alavanca de economia número 1
é a escolha do STT.

**Custo variável estimado por cliente/mês** (estimativa própria, câmbio R$ 5,20):

| Plano | IA (cota cheia) | WhatsApp (cota cheia, mix realista) | Infra estimada | **Custo variável** | **Preço** | **Margem bruta** |
|---|---|---|---|---|---|---|
| Início | R$ 0 | ~R$ 13 (300 msgs, maioria utilidade fora da janela) | ~R$ 8 | **~R$ 21** | R$ 149 | **~86%** |
| Clínica | ~R$ 78 (60 consultas × R$ 1,30) | ~R$ 63 (1.500 msgs) | ~R$ 15 | **~R$ 156** | R$ 329 | **~53%** |
| Hospital | ~R$ 325 (250 consultas) | ~R$ 210 (5.000 msgs) | ~R$ 30 | **~R$ 565** | R$ 699 | **~19%** |

**Leitura crítica destes números — e a decisão que eles forçam.** O cenário acima é o
**pior caso**: cliente consumindo 100% da cota, usando o STT mais caro e enviando tudo
como template fora da janela. Na prática:

- **A cota raramente é consumida.** Assumindo 40% de uso médio, a margem do plano Clínica
  sobe para ~81% e a do Hospital para ~67%.
- **Otimizando o STT** (usar `gpt-4o-mini-transcribe` a USD 0,003/min em vez do Deepgram)
  o custo por consulta cai de R$ 1,30 para ~R$ 0,26 — **corta 80% do custo de IA**.
- **Desenhando o WhatsApp para a janela de 24 h**, o custo de mensageria cai para perto
  de zero.

**Mas a linha do plano Hospital é um alerta real:** com 19% de margem no pior caso, ele é
o plano perigoso. Duas correções recomendadas: (a) **reduzir a cota de IA do Hospital de
250 para 150 consultas/mês** e vender pacotes adicionais, ou (b) **subir o Hospital para
R$ 799**. Recomendo a opção (a) — mantém o preço competitivo, que é a arma principal, e
transfere o risco para consumo medido.

**Regras de gestão de margem:**

1. **Medir consumo de IA e WhatsApp por cliente desde o dia 1.** Sem telemetria, não há
   como defender a margem. Isso precisa existir antes do primeiro cliente pagante.
2. **Cota clara e visível no produto** ("você usou 23 de 60 consultas de IA este mês") —
   evita a reclamação de fatura surpresa, que é o tema nº 1 do Reclame Aqui do setor.
3. **Nunca cortar o serviço ao estourar a cota.** Cobrar o excedente ou degradar para um
   modelo mais barato — cortar gera cancelamento.
4. **Revisar o preço quando a Meta localizar o faturamento em BRL (a partir de
   01/07/2026)** — o câmbio deixa de ser risco direto, mas os valores da tabela mudam.
5. **Câmbio é risco real:** IA e WhatsApp são custos em USD contra receita em BRL. Uma
   alta de 20% no dólar tira ~7 pontos de margem do plano Clínica no cenário de uso
   pleno. Reprecificar anualmente.

### 6.5 Posicionamento em uma frase

> **"Tudo incluso, preço na tela, clínica funcionando hoje. Internação, nota fiscal,
> WhatsApp oficial e IA já vêm dentro — sem taxa de implantação, sem fidelidade e sem
> pertencer ao maior e-commerce pet do país."**

Cada parte dessa frase ataca um concorrente específico: *preço na tela* (Peti9),
*tudo incluso* (SimplesVet e Vetus), *sem implantação* (Peti9), *WhatsApp e IA dentro*
(Vetwork, que cobra R$ 179,90 à parte) e *independência* (todo o grupo Petlove).

---

## 7. Fontes consultadas

Todas acessadas em **04/08/2026**.

### Sites oficiais de concorrentes (preços)
- SimplesVet — Planos e Preços: https://simples.vet/precos/
- SimplesVet — Quem somos: https://simples.vet/quem-somos/
- SimplesVet — Comparativo de planos: https://suporte.simples.vet/pt-BR/articles/9911760-comparativo-de-planos-do-simplesvet
- VetSoft Web — Planos e Preços: https://www.vetsoft.com.br/online/planos/
- Vetus — site oficial (tabela de planos na home): https://vetus.com.br/
- Peti9 — home: https://peti9.com/
- Peti9 — Sistema para Clínica Veterinária: https://peti9.com/sistema-clinica-veterinaria/
- Peti9 — Termos e Condições de Uso (implantação e mensalidades): https://peti9.com/termos-e-condicoes-de-uso/
- Vetwork — Planos e Preços: https://vetwork.com.br/planos/
- VetBase — Preços: https://vetbase.com.br/#pricing
- VetSuite — Planos: https://vetsuite.com.br/planos/
- Fourpet: https://www.fourpet.com.br/
- GoVet: https://www.govet.app/
- Loopvet: https://www.loopvet.com.br/
- Nuvem Vet: https://www.nuvemvet.com/
- Vet Smart — Prontuário PRO: https://plano.vetsmart.com.br/
- Provet Cloud — Pricing: https://www.provet.cloud/pricing

### Mercado e estatísticas (fontes primárias)
- CFMV — Dados Estatísticos (página-mãe): https://www.cfmv.gov.br/dados-estatisticos/transparencia/2019/11/04/
- CFMV — Relatório de clínicas, hospitais, consultórios, ambulatórios e pet shops: https://www.cfmv.gov.br/wp-content/uploads/2026/02/relatorio_clinica_hospital_consultorio.pdf
- CFMV — Relatório geral (profissionais e pessoas jurídicas): https://www.cfmv.gov.br/wp-content/uploads/2026/02/relatorio_geral.pdf
- Abempet / MAPA — Projeção de faturamento do setor pet 2025 (44ª RO da Câmara Setorial, 30/10/2025): https://www.gov.br/agricultura/pt-br/assuntos/camaras-setoriais-tematicas/documentos/camaras-setoriais/animais-e-estimacao/2025/44a-ro-30-10-2025/release-projecao-2025-setor-pet.pdf
- Sebrae — Panorama do Mercado Pet em 2024: https://api.pr.sebrae.com.br/storage/comunidade/anexos/18770/PUB_Panorama%20do%20Mercado%20Pet.pdf
- Sebrae/PR — Análise do Setor de Pet Shop: https://sebraepr.com.br/comunidade/artigo/serie-sebrae-em-dados-e-oportunidades-analise-do-setor-de-pet-shop
- Agência Sebrae — Abertura de pequenos negócios pet cresceu 22%: https://agenciasebrae.com.br/cultura-empreendedora/nos-ultimos-dois-anos-abertura-pequenos-negocios-do-mercado-pet-cresceu-22-no-pais/

### Reputação e consolidação do mercado
- Reclame Aqui — SimplesVet: https://www.reclameaqui.com.br/empresa/simples-vet/
- Reclame Aqui — Vetus Sistema Veterinário: https://www.reclameaqui.com.br/empresa/vetus-sistema-veterinario/
- Reclame Aqui — Vetus, lista de reclamações: https://www.reclameaqui.com.br/empresa/vetus-sistema-veterinario/lista-reclamacoes/
- Reclame Aqui — Vetus, "Pago em dia todos os meses e eles bloqueiam meu sistema": https://www.reclameaqui.com.br/vetus-sistema-veterinario/pago-em-dia-todos-os-meses-e-eles-bloqueiam-meu-sistema_j7ghUuSy49rDpvCO/
- Reclame Aqui — VetSoft Software Veterinário: https://www.reclameaqui.com.br/empresa/vetsoft-software-veterinario/
- Reclame Aqui — Peti9 (sobre a empresa): https://www.reclameaqui.com.br/empresa/peti9/sobre/
- B2B Stack — SimplesVet: https://www.b2bstack.com.br/product/simplesvet
- Medium — "5 pontos negativos do SimplesVet" (nota 3,5 do app na Google Play): https://gelomarte.medium.com/5-pontos-negativos-do-simplesvet-3296ebf44cc6
- PetBR — Petlove adquire SimplesVet: https://www.petbr.com.br/noticias/petlove-adquire-simplesvet-sistema-de-gestao-para-clinicas-pet.html
- Leace — case SimplesVet: https://leace.com.br/simples-vet/

### Custos de WhatsApp e IA
- Meta for Developers — WhatsApp Pricing: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Meta for Developers — Updates to pricing (per-message desde 01/07/2025): https://developers.facebook.com/docs/whatsapp/pricing/updates-to-pricing
- WhatsApp Business Platform — Pricing (rate cards por moeda): https://whatsappbusiness.com/pt-br/products/platform-pricing/
- Anthropic — Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- OpenAI — API Pricing: https://developers.openai.com/api/docs/pricing
- Google — Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Deepgram — Pricing: https://deepgram.com/pricing

### Referência de SaaS B2B para PME brasileira
- Bling — Planos: https://www.bling.com.br/planos
- Olist/Tiny — Planos: https://olist.com/planos/
- Conta Azul — Planos e preços: https://contaazul.com/planos-e-precos/
- Omie — Preços: https://www.omie.com.br/precos/
- eGestor — Planos: https://egestor.com.br/planos.php
- Nibo — Planos e preços: https://www.nibo.com.br/empresa/planos-e-precos

### Regulatório
- Resolução CFMV nº 1.465/2022 (telemedicina veterinária): https://www.legisweb.com.br/legislacao/?id=433219
- CRMV-GO — Modalidades de telemedicina regulamentadas: https://crmvgo.org.br/telemedicina-veterinaria-conheca-as-modalidades-regulamentadas-pelo-cfmv/

---

## 8. Pendências de verificação

- [ ] **Baixar o rate card oficial em BRL** da Meta em
      https://whatsappbusiness.com/pt-br/products/platform-pricing/ (seção `#rates`) —
      é a única forma de cravar os preços de utilidade e autenticação no Brasil e os
      limiares das faixas de volume. Os valores da seção 6.4 são estimativa.
- [ ] Confirmar preços do **Vet Smart Prontuário Pro** na página oficial.
- [ ] Confirmar preços do **Provet Cloud** em fonte primária.
- [ ] Descobrir a faixa de preço da **Peti9** (proposta comercial via cliente oculto) e o
      valor da taxa de implantação — é o dado que falta para calibrar o ataque.
- [ ] Levantar estabelecimentos veterinários de **Minas Gerais** junto ao CRMV-MG
      (ausentes do relatório do CFMV).
- [ ] Validar as dores da seção 4.4 em **entrevistas com veterinários** — a amostra
      pública é pequena demais para decisão de produto.
- [ ] Confirmar se **Vetsoft e Vetus cobram implantação** (não informado nos sites).
