# Módulo Fiscal: construir ou contratar

Pesquisa de 04/08/2026. Preços verificados direto nos sites oficiais.

## Resumo em 5 linhas

Construir emissor próprio é possível, mas é **outro produto**, não um módulo:
NF-e exige integração com 27 SEFAZ e NFS-e com milhares de prefeituras.
O caminho com melhor retorno é **integrar a Focus NFe agora** (R$ 89,90/mês,
sem setup, sem fidelidade, +3.000 municípios) para o VetHub nascer completo,
e reavaliar internalizar quando houver volume que pague o esforço.

---

## Preços reais dos emissores (04/08/2026)

| Provedor | Piso **com API** | Nota extra | Municípios NFS-e | Setup | White label |
|---|---|---|---|---|---|
| **Focus NFe** | **R$ 89,90** (100 notas) | R$ 0,10 | **+3.000** | **R$ 0** | plano parceiro, sob consulta |
| **Notaas** | R$ 0 (50 notas) · R$ 249 SaaS Pro | R$ 0,15 | **não publicado** | não mencionado | **sim, preço público** |
| **NFE.io** | R$ 190 (250 notas) | não publicado | não publicado | R$ 0 | não mencionado |
| **eNotas** | R$ 257 (Plus) | R$ 0,57 | limitado fora do Pro | **R$ 179 a R$ 347** | Nota Gateway, sob consulta |
| **Webmania** | **R$ 499,90** (Business) | R$ 0,45 | Padrão Nacional | R$ 0 no PME | não publicado |
| **PlugNotas/TecnoSpeed** | sob consulta | sob consulta | **+2.200, 153 padrões** | sob consulta | sim, 4.100 software houses |
| ~~Nuvem Fiscal~~ | **DESATIVADA em 31/07/2026** | — | — | — | — |

### Três achados que mudam a decisão

1. **A Nuvem Fiscal encerrou o serviço em 31/07/2026**, quatro dias antes
   desta pesquisa. Era a mais recomendada em fóruns de desenvolvedores
   brasileiros. Se aparecer em algum tutorial, ignore.
   Fonte: comunicado de 22/04/2026 em nuvemfiscal.com.br; `/precos` retorna 404.
2. **A Webmania de R$ 199,90 não tem API**, é só painel. Para embutir no
   VetHub, o piso real dela é R$ 499,90. Cuidado com essa pegadinha.
3. **Focus NFe é o melhor custo-benefício transparente**: R$ 89,90/mês,
   zero setup, sem contrato mínimo, 30 dias de teste, e a garantia contratual
   de integrar qualquer município novo por **R$ 199 em até 15 dias**.
   Atenção: nota **recebida** também consome o pacote.

---

## O que é preciso para emitir por conta própria

Não é um módulo, é um sistema:

- **Certificado digital A1** (.pfx) de cada clínica, guardado com segurança
  em SaaS multi-tenant, com renovação anual. Responsabilidade jurídica pesada.
- **Assinatura XMLDSig** e comunicação **SOAP com mTLS** usando o certificado
  do cliente.
- **27 SEFAZ**, cada uma com seu ambiente, endpoint e comportamento:
  autorização, consulta, cancelamento, inutilização, carta de correção,
  status do serviço, contingência quando cai.
- **NFS-e é o pior problema**: cada município tem seu padrão (ABRASF 1.0/2.0x,
  DSF, ou proprietário). A TecnoSpeed sozinha mantém **153 padrões
  proprietários**. Isso dá a dimensão do trabalho.
- **Reforma Tributária (CBS/IBS)**, em transição de 2026 a 2033: novas notas
  técnicas mexendo no layout durante anos.
- **Incompatível com a Vercel**: precisa de servidor com estado, certificado
  em disco e conexões SOAP longas. Seria um serviço separado (VPS/container).

Isso é facilmente 6 a 12 meses de trabalho dedicado, mais manutenção eterna.
É por isso que existem empresas que só fazem isso.

---

## A conta que importa

Com a Focus NFe a R$ 89,90/mês e o plano Clínica do VetHub a R$ 329:

| | Valor |
|---|---|
| Receita por clínica | R$ 329,00 |
| Custo do emissor | R$ 89,90 (**27%**) |
| WhatsApp | ~R$ 17,50 |
| IA (cota cheia) | ~R$ 40,00 |
| Infra | ~R$ 15,00 |
| **Margem bruta** | **~R$ 166 (50%)** |

O custo do emissor cai por clínica conforme a base cresce (os planos maiores
diluem: o Growth a R$ 548 cobre 4.000 notas. Se cada clínica emite 100
notas/mês, são 40 clínicas por R$ 13,70 cada).

**Ponto de virada:** com ~100 clínicas emitindo, o gasto anual com emissor
passa de R$ 16 mil. Aí sim internalizar começa a se pagar, e você já vai
conhecer a dor do mercado por dentro, com faturamento entrando enquanto isso.

---

## Recomendação em fases

**Fase 1, agora:** integrar a **Focus NFe**. Deixo o código atrás de uma
interface própria (`EmissorFiscal`), então trocar de fornecedor depois, ou
apontar para o seu próprio emissor, é mudar uma implementação, não o sistema.
Prazo: 1 a 2 dias.

**Fase 2, com base formada:** avaliar o emissor próprio começando **só por
NF-e/NFC-e** (27 SEFAZ é finito) e mantendo NFS-e no fornecedor (milhares de
prefeituras é o que não acaba). Bases open source maduras existem em PHP
(`nfephp-org/sped-nfe`) e Python. Em Node/TypeScript o ecossistema é mais
fraco, então provavelmente seria um serviço em outra linguagem.

**Sobre vender para contabilidade:** faz sentido como produto futuro, mas
repare que o mercado já tem 6+ concorrentes estabelecidos e um deles acabou
de fechar as portas. É um mercado difícil. O VetHub tem posicionamento e
diferencial claros; o emissor entraria numa briga de commodity.

---

## Fontes

- https://focusnfe.com.br/precos/ e /termos-de-uso/
- https://enotas.com.br/product-emissor/ e /blog/cupom/ · https://notagateway.com.br/
- https://www.nuvemfiscal.com.br/suporte/ (comunicado de desativação)
- https://tecnospeed.com.br/plugdfe/plugnotas/ e /plugdfe/nfse/
- https://webmania.com.br/nota-fiscal-eletronica/
- https://nfe.io/precos/emissao-nfse/ e /emissao-nfe/
- https://www.notaas.com.br/

> Alerta: o site `enotass.com.br` (dois "s") não é oficial. E a Notaas é um
> player pequeno e recente, sem CNPJ visível nem número de municípios
> publicado. Valide contrato e SLA antes de depender dela.
