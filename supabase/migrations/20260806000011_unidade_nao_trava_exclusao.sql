-- ============================================================
-- Apagar a clínica não pode ficar travado pela unidade
--
-- Ao criar o multi-unidade, as colunas `unidade_id` ficaram com
-- `on delete restrict`. A intenção era boa: impedir que alguém apague uma
-- filial e leve junto o histórico de vendas dela.
--
-- Mas isso travou a exclusão da CLÍNICA. Ao apagar uma clínica, o banco
-- cascateia para todas as tabelas que apontam para ela — inclusive `unidade`
-- — e a exclusão da unidade quica no restrict das vendas e lotes que ainda
-- estão sendo apagados na mesma operação. A ordem do cascade não é
-- garantida, então às vezes passa e às vezes não.
--
-- Foi assim que apareceu: o teste de isolamento entre clínicas cria duas
-- clínicas e apaga no fim, e elas começaram a se acumular no banco.
--
-- A troca para `set null` resolve sem abrir mão da proteção: quem apaga uma
-- filial por engano perde o VÍNCULO dos registros com ela, não os registros.
-- Vínculo perdido se corrige; venda apagada, não. E apagar filial continua
-- barrado na interface e na política do banco — a matriz nem aparece como
-- opção, e o caminho normal é desativar.
-- ============================================================

do $$
declare
  t text;
  nome_constraint text;
begin
  foreach t in array array[
    'lote', 'movimentacao_estoque', 'caixa', 'venda', 'compra',
    'agendamento', 'internacao'
  ] loop
    select conname into nome_constraint
    from pg_constraint
    where conrelid = format('public.%I', t)::regclass
      and contype = 'f'
      and conname like '%unidade_id%';

    if nome_constraint is not null then
      execute format('alter table public.%I drop constraint %I', t, nome_constraint);
    end if;

    execute format(
      'alter table public.%1$I
         add constraint %1$s_unidade_id_fkey
         foreign key (unidade_id) references public.unidade (id) on delete set null', t
    );
  end loop;
end $$;
