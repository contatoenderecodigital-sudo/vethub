# As 8 dores do mercado: onde os concorrentes falham

Levantamento de reclamações públicas (Reclame Aqui), avaliações e **cláusulas
contratuais** dos concorrentes. Pesquisa de 04/08/2026.

Este é o documento mais importante da pasta: cada dor aqui é uma **decisão de
produto** e um **argumento de venda** do VetHub. As citações são verbatim de
clientes reais.

## Reputação dos concorrentes (Reclame Aqui, dados exatos)

| Software | Reclamações (12m) | Nota final | Voltaria a comprar | Tempo de resposta | Status |
|---|---|---|---|---|---|
| **Vetus** (Petlove) | 44 | **4,7** | **21,1%** | **8 dias** | **NÃO RECOMENDADA** |
| **SimplesVet** (Petlove) | 17 | 6,9 | 63,6% | 2 dias | Regular |
| **Vetsoft** | 0 | — | — | — | Sem reputação |
| **Peti9** | 0 | — | — | — | Sem reputação (não verificada) |

A Vetus despencou de **7,5 (Bom)** há dois anos para **4,7 (Não Recomendada)**
hoje. "Voltaria a fazer negócio" caiu de 58% para 21%. É o cliente mais fácil
de conquistar do mercado.

Observação honesta: nota zero da Vetsoft e da Peti9 significa base menor e
menos exposição, **não** qualidade comprovada.

---

## As 8 dores (ordem de prioridade para o VetHub)

### 1. Bloqueio de acesso por inadimplência em um sistema de saúde
A dor mais brutal e mais repetida. Clínica perde o prontuário porque o boleto
venceu num sábado.

> *"Sou proprietária de uma clínica veterinária 24 horas e, neste momento,
> estou com um paciente em estado crítico sem acesso ao [sistema]..."*

> *"Estou há 1 hora tentando um desbloqueio do meu sistema que está pago, já
> enviei o comprovante, ninguém responde."*

O contrato da Vetus formaliza: bloqueio 72h após aviso, desbloqueio só depois
da compensação bancária ("pode levar até 3 dias úteis").

**→ Decisão VetHub:** inadimplência **nunca** corta o acesso ao prontuário.
Modo somente-leitura de emergência + desbloqueio instantâneo por PIX.
É posicionamento ético e legal (a Resolução CFMV 1.653/2025 obriga o
veterinário a guardar e entregar prontuário, ele não pode depender do boleto).

### 2. Suporte só em horário comercial, para negócios que funcionam 24h
Vetsoft, Vetus e SimplesVet: **todos** seg-sex 8h-18h.

> *"O sistema está fora do ar e simplesmente não tem suporte técnico aos finais
> de semana. Como pode uma empresa que vende sistema [para saúde]..."*

**→ Decisão VetHub:** plantão real de incidente fora do horário comercial
(nem precisa ser humano 24/7 no início, basta alguém de sobreaviso para
queda de sistema). Nenhum concorrente oferece.

### 3. Instabilidade com impacto clínico e sem nenhum SLA
> *"Instabilidades com MUITA frequência e não são minutos, são HORAS."*

Os contratos da SimplesVet (8.1.1) e da Vetus (3.5) **se isentam
explicitamente** de qualquer responsabilidade por indisponibilidade.

**→ Decisão VetHub:** status page pública + SLA de uptime contratual com
crédito na fatura. Inédito no segmento.

### 4. Módulo fiscal vendido à parte, e que quebra
Preço do add-on fiscal: SimplesVet **+R$ 153/mês**, Vetus **+R$ 149,90/mês**,
Vetsoft **+R$ 97/mês por tipo de nota** (NFC-e + NFS-e = R$ 194).

E é o módulo que mais falha: "sem emitir NFS-e desde novembro", "não emite no
Ceará", "alíquota zerada há mais de um mês", "não adequado à Reforma
Tributária".

> *"O sistema vende um produto a mais na mensalidade para emissão de nota
> fiscal. Comprei o produto, pois é necessário..."*

**→ Decisão VetHub:** fiscal **incluso** no plano Clínica e que funcione.

### 5. Preço opaco e modular: o básico vira add-on
- Vetus: todos os planos "até 2 usuários"; multi-filial +R$ 129,90
- Vetsoft: **internação e exames são complementos pagos**
- SimplesVet: plano Pet Shop limitado a **80 notas/mês**
- Peti9: **não publica preço** e cobra implantação
- Mercado cobra R$ 800 a R$ 2.000 de setup

> *"Desigualdade de preços para contratação entre novos e clientes antigos"*

**→ Decisão VetHub:** preço público na home, tudo incluso, zero implantação,
zero fidelidade.

### 6. Sequestro de dados na saída
"Não consigo cancelar" é **6,73% de todas as reclamações da Vetus** (taxonomia
da própria Reclame Aqui).

> *"Desde o dia 07/04/25, requisitando o BACKUP diariamente e eles só estão
> enrolando para enviar"*

Na saída: a Vetus **apaga tudo em 60 dias** e entrega um dump PostgreSQL
("SCHEMA") que nenhum veterinário consegue ler. A SimplesVet entrega CSV só
sob solicitação. E a **Resolução CFMV 1.653/2025** exige guarda de 5 anos e
entrega de cópia do prontuário ao tutor em até 5 dias úteis. A
responsabilidade é do veterinário, mas os dados estão presos no fornecedor.

**→ Decisão VetHub:** botão de **exportar tudo, self-service, a qualquer
momento**, em PDF (prontuário legível) e CSV/JSON (dados). É a promessa
anti-lock-in mais forte possível nesse mercado, e vira feature de marketing:
*"seus dados são seus, e você baixa quando quiser, inclusive no dia que for
embora."*

### 7. Migração de entrada difícil (o custo de troca trava o mercado)
Todos prometem "migração gratuita", mas a SimplesVet admite no próprio site:
*"Nem todos os dados do sistema anterior serão convertidos"* e *"para realizar
a importação, é necessário apagar todos os dados já inseridos"*.

> *"os problemas começaram na migração de dados, não cumpriram o prometido,
> perdi vários [cadastros]"*

**→ Decisão VetHub:** importador que **mescla** (não apaga), com prévia de
validação antes de confirmar. Fosso competitivo real: é o que impede a clínica
de trocar de sistema hoje.

### 8. Conflito de interesse da consolidação Petlove
Um grupo só controla **SimplesVet + Vetus + Vet Smart**, e vende plano de
saúde pet, e-commerce e maquininha para os mesmos clientes.

> *"Desvio de Recebíveis para Conta da Petlove sem Consentimento"*
> *"Obrigatoriedade de uso da Stone para integrar a TEF e não te dá opção de
> outras máquinas de cartão"*

**→ Decisão VetHub:** neutralidade. Não competimos com o cliente, não
monetizamos os dados dele, TEF aberto. **Nenhum líder pode copiar isso**,
é estrutural.

**Menções honrosas:** relatórios financeiros incompletos e não confiáveis
(forte na SimplesVet); UX com excesso de cliques (Vetus e Provet Cloud);
ausência de receita digital com certificado ICP-Brasil; app mobile fraco.

---

## Como isso vira mensagem de venda

Cada dor acima é um item da página de preços do VetHub:

| Dor do mercado | Promessa do VetHub |
|---|---|
| Bloqueiam o sistema com paciente internado | **Prontuário nunca bloqueia**, mesmo com fatura em aberto |
| Suporte 8h-18h de segunda a sexta | **Plantão de incidente** fora do horário comercial |
| Caem por horas, sem SLA | **SLA com crédito** + status page pública |
| Fiscal é add-on de R$ 150 | **Fiscal incluso** |
| Preço sob consulta, setup de R$ 2 mil | **Preço na home, zero implantação** |
| Prendem seus dados na saída | **Exportar tudo com um clique, sempre** |
| Migração apaga o que você já tem | **Importador que mescla, com prévia** |
| O dono do sistema é seu concorrente | **Somos só software. Não vendemos pet.** |

---

## Ressalvas metodológicas

- Páginas individuais de reclamação do Reclame Aqui bloqueiam acesso
  automatizado; as citações são os trechos truncados das listagens (verbatim,
  porém cortados).
- Sites de review (Capterra BR, B2B Stack, GetApp) estão **vazios** para
  software vet brasileiro, quase todos com zero avaliações. O Reclame Aqui é
  a única fonte pública de dor real.
- Não há discussão indexável em Reddit/LinkedIn sobre o tema no Brasil; o
  debate acontece em grupos fechados de WhatsApp e Facebook.
- Peti9, ClinicVet, Nuvem Vet e VetPlus não têm nenhuma fonte independente:
  ausência de reclamação não é atestado de qualidade.
