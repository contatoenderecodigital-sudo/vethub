-- ============================================================
-- Orçamento aprovado deixa de ser beco sem saída
--
-- Aprovar um orçamento só mudava o status. Não virava venda, não virava
-- conta a receber, não entrava no PDV: para cobrar, alguém tinha que
-- redigitar item por item. Na prática, ninguém usava o módulo.
--
-- Aqui o item do orçamento passa a poder apontar para o item do catálogo.
-- É isso que permite a venda gerada dar baixa no estoque certo em vez de
-- tratar tudo como texto solto.
-- ============================================================

alter table public.orcamento_item
  add column if not exists item_id uuid
    references public.item (id) on delete set null;

create index if not exists idx_orcamento_item_item
  on public.orcamento_item (item_id)
  where item_id is not null;

comment on column public.orcamento_item.item_id is
  'Item do catálogo por trás da linha. Nulo = linha digitada à mão.';

-- Guarda de qual orçamento a venda nasceu, para o histórico fechar o ciclo
-- e para a mesma aprovação não virar duas vendas por engano.
alter table public.venda
  add column if not exists orcamento_id uuid
    references public.orcamento (id) on delete set null;

create unique index if not exists uniq_venda_orcamento
  on public.venda (orcamento_id)
  where orcamento_id is not null and status <> 'cancelada';
