-- ============================================================
-- Livro único: uma dívida, um lugar
--
-- O sistema tinha DOIS livros para a mesma dívida:
--   * lancamento_financeiro  -> o extrato do tutor
--   * conta                  -> as contas a receber
--
-- A mesma cirurgia aparecia em um e não no outro: a ficha do tutor mostrava
-- R$ 120 e o relatório de clientes R$ 450. Duas verdades = cobrança errada.
--
-- Aqui `conta` passa a ser o ÚNICO livro. Toda venda, plano e cobrança
-- avulsa vira uma conta; todo pagamento vira uma baixa. O extrato do tutor
-- deixa de ser tabela própria e passa a ser leitura das contas dele.
--
-- Ninguém usa o sistema ainda, então a mudança é feita na raiz em vez de
-- remendada. Os poucos registros de teste são preservados.
-- ============================================================

-- ------------------------------------------------------------
-- 1. `conta` ganha o que faltava
-- ------------------------------------------------------------

-- Data de COMPETÊNCIA: quando a dívida nasceu (a venda, o serviço).
-- Diferente de `vencimento` (quando é para pagar) e da data da baixa
-- (quando o dinheiro entrou). São as três perguntas que o dono faz:
-- "quanto vendi", "quanto vence" e "quanto entrou".
alter table public.conta
  add column if not exists competencia date not null
    default (now() at time zone 'America/Sao_Paulo')::date;

-- De onde a conta veio. Serve para o painel separar receita de venda,
-- de plano e de cobrança avulsa sem adivinhar pela descrição.
alter table public.conta
  add column if not exists origem text not null default 'avulso';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conta_origem_check'
  ) then
    alter table public.conta add constraint conta_origem_check
      check (origem in ('venda', 'compra', 'assinatura', 'consulta', 'orcamento', 'avulso'));
  end if;
end $$;

alter table public.conta
  add column if not exists assinatura_id uuid
    references public.assinatura (id) on delete set null;

-- Trava contra cobrar a mesma assinatura duas vezes no mesmo vencimento.
-- É o que deixa a tarefa agendada rodar de novo sem medo: se já gerou,
-- o banco recusa a segunda.
create unique index if not exists uniq_conta_assinatura_vencimento
  on public.conta (assinatura_id, vencimento)
  where assinatura_id is not null;

create index if not exists idx_conta_competencia
  on public.conta (clinica_id, competencia);

-- ------------------------------------------------------------
-- 2. `baixa`: cada pagamento é um evento, não um campo
-- ------------------------------------------------------------
-- `conta.valor_pago` sozinho não conta a história: quem pagou R$ 50 hoje e
-- R$ 70 semana que vem tem duas entradas de caixa em datas diferentes. Sem
-- guardar cada uma, o relatório de caixa mente.
create table if not exists public.baixa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  conta_id uuid not null references public.conta (id) on delete cascade,
  valor numeric(12, 2) not null check (valor > 0),
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  forma_pagamento text,
  caixa_id uuid references public.caixa (id) on delete set null,
  observacao text,
  registrado_por uuid references public.usuario (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_baixa_conta on public.baixa (conta_id);
create index if not exists idx_baixa_clinica_data on public.baixa (clinica_id, data desc);

-- ------------------------------------------------------------
-- 3. A conta se atualiza sozinha a partir das baixas
-- ------------------------------------------------------------
create or replace function public.recalcular_conta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo uuid := coalesce(new.conta_id, old.conta_id);
  pago numeric(12, 2);
  ultima date;
  ultima_forma text;
  total numeric(12, 2);
begin
  select coalesce(sum(valor), 0), max(data)
    into pago, ultima
    from public.baixa where conta_id = alvo;

  select forma_pagamento into ultima_forma
    from public.baixa where conta_id = alvo
    order by data desc, created_at desc limit 1;

  select valor into total from public.conta where id = alvo;

  update public.conta set
    valor_pago = pago,
    pagamento = ultima,
    forma_pagamento = coalesce(ultima_forma, forma_pagamento),
    status = case
      when status = 'cancelada' then 'cancelada'
      when pago <= 0 then 'aberta'
      when pago >= total then 'paga'
      else 'parcial'
    end
  where id = alvo;

  return null;
end $$;

drop trigger if exists trg_baixa_recalcula on public.baixa;
create trigger trg_baixa_recalcula
  after insert or update or delete on public.baixa
  for each row execute function public.recalcular_conta();

-- ------------------------------------------------------------
-- 4. Traz o extrato antigo para o livro único
-- ------------------------------------------------------------
-- Débito do tutor  -> conta a receber dele.
-- Crédito do tutor -> conta a PAGAR para ele (a clínica é que deve).
--   É por isso que não precisa de um terceiro tipo: o sinal do extrato sai
--   naturalmente de "o que ele me deve" menos "o que eu devo a ele".
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'lancamento_financeiro') then

    insert into public.conta (
      clinica_id, tipo, descricao, tutor_id, valor, valor_pago,
      competencia, vencimento, status, origem, registrado_por, created_at
    )
    select
      l.clinica_id,
      case when l.tipo = 'debito' then 'receber' else 'pagar' end,
      l.descricao,
      l.tutor_id,
      l.valor,
      0,
      l.data,
      l.data,
      'aberta',
      case when l.consulta_id is not null then 'consulta'
           when l.orcamento_id is not null then 'orcamento'
           else 'avulso' end,
      l.registrado_por,
      l.created_at
    from public.lancamento_financeiro l;

    drop table public.lancamento_financeiro cascade;
  end if;
end $$;

-- ------------------------------------------------------------
-- 5. Saldo do tutor, agora lendo o livro único
-- ------------------------------------------------------------
-- Negativo = o tutor deve para a clínica (mesma convenção de antes).
create or replace function public.saldo_do_tutor(p_tutor_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    case when tipo = 'pagar' then (valor - valor_pago)
         else -(valor - valor_pago) end
  ), 0)
  from public.conta
  where tutor_id = p_tutor_id
    and status <> 'cancelada';
$$;

-- ------------------------------------------------------------
-- 6. Segurança da tabela nova (mesmo padrão das outras)
-- ------------------------------------------------------------
alter table public.baixa enable row level security;

drop policy if exists "baixa: select da clinica" on public.baixa;
drop policy if exists "baixa: insert na clinica" on public.baixa;
drop policy if exists "baixa: update da clinica" on public.baixa;
drop policy if exists "baixa: delete da clinica" on public.baixa;

create policy "baixa: select da clinica" on public.baixa for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "baixa: insert na clinica" on public.baixa for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "baixa: update da clinica" on public.baixa for update to authenticated
  using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "baixa: delete da clinica" on public.baixa for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

grant select, insert, update, delete on public.baixa to authenticated;
grant all privileges on public.baixa to service_role;
