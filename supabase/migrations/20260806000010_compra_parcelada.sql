-- ============================================================
-- Compra: prazo e parcelas escolhidos, frete rateado no custo
--
-- Receber mercadoria gerava UMA conta a pagar com vencimento fixo em 30
-- dias e sem categoria. Fornecedor real não trabalha assim: negocia 30/60/90,
-- às vezes à vista com desconto. Quem comprava parcelado tinha que apagar a
-- conta gerada e lançar as parcelas à mão, o que anula o ganho de ter o
-- módulo de compras.
--
-- O frete também ficava de fora do custo. Uma caixa de ração de R$ 200 com
-- R$ 35 de frete custou R$ 235 para a clínica: precificar em cima de R$ 200
-- come a margem em silêncio.
-- ============================================================

alter table public.compra
  add column if not exists parcelas integer not null default 1
    check (parcelas between 1 and 24);

alter table public.compra
  add column if not exists prazo_dias integer not null default 30
    check (prazo_dias between 0 and 365);

comment on column public.compra.parcelas is
  'Em quantas vezes a nota será paga. Uma conta a pagar por parcela.';
comment on column public.compra.prazo_dias is
  'Dias até a primeira parcela. 0 = à vista, na data da nota.';
