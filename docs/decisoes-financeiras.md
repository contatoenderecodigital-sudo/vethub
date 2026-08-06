# Decisões financeiras do VetHub

Como o dinheiro anda por dentro do sistema, e por quê. Escrito depois de
olhar o que o mercado faz (SimplesVet, Conta Azul, QuantoSobra, NuvemGestor,
Vindi) e a prática contábil brasileira.

## A regra de ouro: toda venda vira uma conta a receber

**Decisão:** nenhuma venda cria "receita" solta. Toda venda gera uma conta a
receber; o pagamento **baixa** essa conta.

- **À vista:** a conta nasce e é baixada na mesma hora, com data de hoje.
- **Fiado / a prazo:** a conta nasce em aberto, com vencimento.
- **Parcelado:** uma conta por parcela.

Isso é o padrão do mercado. Nos sistemas do setor, "ao efetuar uma venda a
prazo automaticamente já se cria um registro em contas a receber com as
parcelas devidamente calculadas", e no fluxo de caixa "automaticamente já
são lançadas as parcelas recebidas".

### Por que isso importa aqui

Resolve de uma vez os dois furos que a auditoria encontrou:

1. **Extrato do tutor ≠ contas a receber.** A ficha da Maria mostrava
   R$ 120,00 (só o fiado) e o relatório de clientes mostrava R$ 450,00 (a
   conta a receber da cirurgia). Eram dois livros paralelos para a mesma
   dívida — receita garantida de cobrar errado. Com uma conta a receber por
   venda, **o extrato do tutor passa a ser a soma das contas a receber dele**.
   Um livro só.

2. **Painel financeiro ignorava o PDV.** Vendi R$ 120,50 e o painel mostrava
   R$ 0,00, porque ele só enxergava contas a pagar/receber. Se toda venda
   gera conta a receber, o painel passa a enxergar tudo sem virar outra coisa.

É também o desenho do SimplesVet, que tem uma tela de "Saldo de clientes"
onde dá para "analisar detalhadamente as vendas que compõem o total de
débitos do cliente" — as vendas **são** o débito, não um registro paralelo.

## Quando a receita conta: na venda ou no recebimento?

**As duas.** Não é escolha, são duas perguntas diferentes:

| Pergunta | Regime | Data que vale |
| --- | --- | --- |
| "Quanto eu vendi em agosto?" | **Competência** | data da venda |
| "Quanto entrou no caixa em agosto?" | **Caixa** | data da baixa |

Na venda à vista as duas datas são a mesma, então não muda nada. A diferença
aparece no fiado e no parcelado: a venda é de agosto, o dinheiro entra em
setembro.

**Decisão:** guardar as duas datas (`data da venda` e `data da baixa`) e
deixar o painel financeiro com um alternador **Caixa / Competência**, sendo
**Caixa o padrão**.

Por que Caixa como padrão: a clínica pequena quer saber quanto tem no bolso.
Empresas de médio e grande porte e as do Lucro Real são obrigadas ao regime
de competência; micro e pequena empresa no Simples, que é o público do
VetHub, trabalha no caixa. Mas a visão de competência precisa existir, senão
o dono nunca sabe se vendeu bem num mês em que recebeu pouco.

> Isso é decisão de *relatório*, não de contabilidade fiscal. Quem declara
> imposto é o contador da clínica; o sistema só precisa mostrar os dois
> números sem mentir em nenhum.

## Assinaturas: quem gera a cobrança

Hoje a assinatura é decorativa — cria o cadastro com "próxima cobrança
05/09" e nunca gera nada.

**Decisão:** uma tarefa agendada roda todo dia e, para cada assinatura ativa
com cobrança vencendo, **gera a conta a receber** e empurra a próxima data.
A conta a receber gerada é igual a qualquer outra: aparece no extrato do
tutor, no painel e no relatório.

O que o mercado faz além disso é **cobrar sozinho** no cartão (Vindi,
Mercado Pago, Asaas): "o valor do plano é descontado direto do cartão do
cliente, sem que ele precise se deslocar e sem que você precise ficar
ligando para cobrar". Isso é integração com gateway de pagamento e fica para
depois — mas o desenho da conta a receber já nasce pronto para receber essa
baixa automática quando existir.

**Ordem sugerida:** primeiro gerar a cobrança (resolve o módulo estar
quebrado), depois integrar gateway (vira diferencial de venda).

## Crédito do cliente (troco, devolução, adiantamento)

O mercado trata crédito como o espelho do débito, na mesma tela de saldo. No
SimplesVet o crédito nasce "por devolução de produtos ou serviços,
antecipação de valores ou quando o cliente opta por deixar o valor do troco
como crédito", e na hora da venda o vendedor já vê se o tutor tem crédito ou
pendência.

**Decisão:** não construir agora, mas **o extrato do tutor já deve nascer
com sinal** (+ crédito / − débito) para não precisar de outra migração
quando isso entrar.

## Resumo das decisões

1. Toda venda gera conta a receber; pagamento baixa. Nunca duas verdades.
2. Extrato do tutor = as contas a receber dele. Um livro só.
3. Guardar data da venda **e** data da baixa; painel alterna Caixa (padrão)
   e Competência.
4. Assinatura gera conta a receber por tarefa agendada; cobrança automática
   no cartão fica para a fase de gateway.
5. Extrato nasce com sinal, para crédito de cliente entrar sem migração.

## Fontes

- [Regime de competência — Contabilizei](https://www.contabilizei.com.br/contabilidade-online/regime-de-competencia/)
- [Regime de caixa — Conta Azul](https://contaazul.com/blog/regime-de-caixa/)
- [Conta a receber: como lançar — Conta Azul](https://ajuda.contaazul.com/hc/pt-br/articles/7312413449613-Conta-a-receber-como-lan%C3%A7ar)
- [Diferença entre regime de caixa e competência — Treasy](https://www.treasy.com.br/blog/diferenca-entre-regime-de-caixa-e-regime-de-competencia/)
- [Crédito de cliente — SimplesVet](https://simples.vet/funcionalidades/credito-de-cliente/)
- [O que é o saldo dos clientes — Suporte SimplesVet](https://suporte.simples.vet/pt-BR/articles/6653110-o-que-e-o-saldo-dos-clientes)
- [Programa para loja de veterinária — QuantoSobra](https://www.quantosobra.com.br/programa-para-loja-de-veterinaria/)
- [Software para pet shops — NuvemGestor](https://nuvemgestor.com.br/software-gestao-empresas/sistema-gerenciamento/software-pet-shops-loja-de-animais-veterinarios/software-para-gestao-de-pet-shops-loja-de-animais.asp)
- [Recorrência para pet shop — Vindi](https://blog.vindi.com.br/recorrencia-para-pet-shop/)
- [Point Smart para pet shops — Mercado Pago](https://www.mercadopago.com.br/blog/point-smart-pet-shops)
