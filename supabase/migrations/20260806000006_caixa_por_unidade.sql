-- ============================================================
-- Um caixa aberto POR UNIDADE, não por clínica
--
-- O índice antigo garantia um único caixa aberto por clínica. Com filiais
-- isso vira trava: a Matriz abre o caixa às 8h e a unidade Centro não
-- consegue abrir o dela, porque o banco recusa. Cada filial tem gaveta
-- própria e turno próprio.
-- ============================================================

drop index if exists public.idx_caixa_unico_aberto;

create unique index if not exists idx_caixa_unico_aberto
  on public.caixa (unidade_id)
  where status = 'aberto';
