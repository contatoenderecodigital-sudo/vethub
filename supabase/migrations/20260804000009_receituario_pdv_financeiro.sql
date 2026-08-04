-- ============================================================
-- VetHub — receituário, PDV/vendas e financeiro completo
-- Fecha a lista de funcionalidades da concorrência.
-- ============================================================

-- ------------------------------------------------------------
-- 1. RECEITUÁRIO
-- ------------------------------------------------------------
create table if not exists public.receita (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,
  consulta_id uuid references public.consulta (id) on delete set null,
  veterinario_id uuid references public.usuario (id) on delete set null,
  tipo text not null default 'simples' check (tipo in ('simples', 'controlada', 'manipulada')),
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  orientacoes text,
  retorno_em date,
  created_at timestamptz not null default now()
);

create index if not exists idx_receita_clinica on public.receita (clinica_id, data desc);
create index if not exists idx_receita_pet on public.receita (pet_id, data desc);
create index if not exists idx_receita_consulta on public.receita (consulta_id);

create table if not exists public.receita_item (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references public.receita (id) on delete cascade,
  item_id uuid references public.item (id) on delete set null,
  medicamento text not null,
  concentracao text,
  forma_farmaceutica text,      -- comprimido, suspensão, injetável
  quantidade text,              -- "1 caixa", "30 comprimidos"
  posologia text not null,      -- "1 comprimido a cada 12h por 7 dias"
  via text,                     -- oral, tópica, IM, SC, IV
  observacao text,
  ordem integer not null default 0
);

create index if not exists idx_receita_item_receita on public.receita_item (receita_id, ordem);

-- ------------------------------------------------------------
-- 2. VENDAS / PDV
-- ------------------------------------------------------------
create table if not exists public.caixa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  aberto_por uuid references public.usuario (id) on delete set null,
  fechado_por uuid references public.usuario (id) on delete set null,
  abertura timestamptz not null default now(),
  fechamento timestamptz,
  valor_abertura numeric(12, 2) not null default 0,
  valor_fechamento numeric(12, 2),
  observacao text,
  status text not null default 'aberto' check (status in ('aberto', 'fechado'))
);

create index if not exists idx_caixa_clinica on public.caixa (clinica_id, abertura desc);
-- só um caixa aberto por clínica ao mesmo tempo
create unique index if not exists idx_caixa_unico_aberto on public.caixa (clinica_id)
  where status = 'aberto';

create table if not exists public.venda (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  caixa_id uuid references public.caixa (id) on delete set null,
  tutor_id uuid references public.tutor (id) on delete set null,
  pet_id uuid references public.pet (id) on delete set null,
  consulta_id uuid references public.consulta (id) on delete set null,
  orcamento_id uuid references public.orcamento (id) on delete set null,
  numero serial,
  data timestamptz not null default now(),
  subtotal numeric(12, 2) not null default 0,
  desconto numeric(12, 2) not null default 0 check (desconto >= 0),
  valor_total numeric(12, 2) not null default 0,
  status text not null default 'aberta' check (status in ('aberta', 'paga', 'cancelada')),
  vendedor_id uuid references public.usuario (id) on delete set null,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_venda_clinica on public.venda (clinica_id, data desc);
create index if not exists idx_venda_tutor on public.venda (tutor_id);
create index if not exists idx_venda_caixa on public.venda (caixa_id);

drop trigger if exists trg_venda_updated_at on public.venda;
create trigger trg_venda_updated_at
  before update on public.venda
  for each row execute function public.set_updated_at();

create table if not exists public.venda_item (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.venda (id) on delete cascade,
  item_id uuid references public.item (id) on delete set null,
  descricao text not null,
  quantidade numeric(12, 3) not null check (quantidade > 0),
  valor_unitario numeric(12, 2) not null check (valor_unitario >= 0),
  desconto numeric(12, 2) not null default 0,
  profissional_id uuid references public.usuario (id) on delete set null
);

create index if not exists idx_venda_item_venda on public.venda_item (venda_id);

create table if not exists public.pagamento_venda (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.venda (id) on delete cascade,
  forma text not null,
  valor numeric(12, 2) not null check (valor > 0),
  parcelas integer not null default 1 check (parcelas > 0),
  autorizacao text,             -- NSU/autorização do TEF
  created_at timestamptz not null default now()
);

create index if not exists idx_pagamento_venda on public.pagamento_venda (venda_id);

-- Totais da venda recalculados a partir dos itens
create or replace function public.recalcular_venda()
returns trigger
language plpgsql
as $$
declare
  v_venda uuid;
begin
  v_venda := coalesce(new.venda_id, old.venda_id);
  update public.venda v
  set subtotal = coalesce((
        select sum(i.quantidade * i.valor_unitario - i.desconto)
        from public.venda_item i where i.venda_id = v_venda
      ), 0),
      valor_total = greatest(coalesce((
        select sum(i.quantidade * i.valor_unitario - i.desconto)
        from public.venda_item i where i.venda_id = v_venda
      ), 0) - v.desconto, 0)
  where v.id = v_venda;
  return null;
end;
$$;

drop trigger if exists trg_venda_item_recalc on public.venda_item;
create trigger trg_venda_item_recalc
  after insert or update or delete on public.venda_item
  for each row execute function public.recalcular_venda();

-- ------------------------------------------------------------
-- 3. FINANCEIRO: contas a pagar e a receber
-- ------------------------------------------------------------
create table if not exists public.categoria_financeira (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  created_at timestamptz not null default now(),
  unique (clinica_id, nome, tipo)
);

create table if not exists public.conta (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  tipo text not null check (tipo in ('receber', 'pagar')),
  descricao text not null,
  categoria_id uuid references public.categoria_financeira (id) on delete set null,
  tutor_id uuid references public.tutor (id) on delete set null,
  venda_id uuid references public.venda (id) on delete set null,
  fornecedor text,
  valor numeric(12, 2) not null check (valor > 0),
  valor_pago numeric(12, 2) not null default 0,
  vencimento date not null,
  pagamento date,
  forma_pagamento text,
  status text not null default 'aberta' check (status in ('aberta', 'paga', 'parcial', 'cancelada')),
  observacao text,
  registrado_por uuid references public.usuario (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conta_clinica on public.conta (clinica_id, vencimento);
create index if not exists idx_conta_tipo_status on public.conta (clinica_id, tipo, status);
create index if not exists idx_conta_tutor on public.conta (tutor_id);

drop trigger if exists trg_conta_updated_at on public.conta;
create trigger trg_conta_updated_at
  before update on public.conta
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. RLS + grants
-- ------------------------------------------------------------
alter table public.receita enable row level security;
alter table public.receita_item enable row level security;
alter table public.caixa enable row level security;
alter table public.venda enable row level security;
alter table public.venda_item enable row level security;
alter table public.pagamento_venda enable row level security;
alter table public.categoria_financeira enable row level security;
alter table public.conta enable row level security;

-- Tabelas com clinica_id próprio
do $$
declare t text;
begin
  foreach t in array array[
    'receita', 'caixa', 'venda', 'categoria_financeira', 'conta'
  ] loop
    execute format($f$
      create policy "%1$s: select da clinica" on public.%1$I for select to authenticated
        using (clinica_id = (select public.clinica_do_usuario()));
      create policy "%1$s: insert na clinica" on public.%1$I for insert to authenticated
        with check (clinica_id = (select public.clinica_do_usuario()));
      create policy "%1$s: update da clinica" on public.%1$I for update to authenticated
        using (clinica_id = (select public.clinica_do_usuario()))
        with check (clinica_id = (select public.clinica_do_usuario()));
      create policy "%1$s: delete da clinica" on public.%1$I for delete to authenticated
        using (clinica_id = (select public.clinica_do_usuario()));
    $f$, t);
  end loop;
end $$;

-- Tabelas filhas: isolamento pela linha pai
create policy "receita_item: via receita" on public.receita_item for all to authenticated
  using (exists (select 1 from public.receita r where r.id = receita_id
    and r.clinica_id = (select public.clinica_do_usuario())))
  with check (exists (select 1 from public.receita r where r.id = receita_id
    and r.clinica_id = (select public.clinica_do_usuario())));

create policy "venda_item: via venda" on public.venda_item for all to authenticated
  using (exists (select 1 from public.venda v where v.id = venda_id
    and v.clinica_id = (select public.clinica_do_usuario())))
  with check (exists (select 1 from public.venda v where v.id = venda_id
    and v.clinica_id = (select public.clinica_do_usuario())));

create policy "pagamento_venda: via venda" on public.pagamento_venda for all to authenticated
  using (exists (select 1 from public.venda v where v.id = venda_id
    and v.clinica_id = (select public.clinica_do_usuario())))
  with check (exists (select 1 from public.venda v where v.id = venda_id
    and v.clinica_id = (select public.clinica_do_usuario())));

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;

-- ------------------------------------------------------------
-- 5. Semente: categorias financeiras padrão
-- ------------------------------------------------------------
insert into public.categoria_financeira (clinica_id, nome, tipo)
select c.id, x.nome, x.tipo
from public.clinica c
cross join (values
  ('Consultas', 'receita'), ('Vacinas', 'receita'), ('Cirurgias', 'receita'),
  ('Banho e tosa', 'receita'), ('Venda de produtos', 'receita'), ('Internação', 'receita'),
  ('Aluguel', 'despesa'), ('Salários', 'despesa'), ('Fornecedores', 'despesa'),
  ('Energia e água', 'despesa'), ('Impostos', 'despesa'), ('Marketing', 'despesa'),
  ('Manutenção', 'despesa'), ('Outros', 'despesa')
) as x(nome, tipo)
on conflict (clinica_id, nome, tipo) do nothing;
