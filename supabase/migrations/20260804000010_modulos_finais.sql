-- ============================================================
-- VetHub — módulos finais
-- Fornecedores e compras, planos/assinaturas, comissões e
-- banho e tosa (ficha do pet + pacotes).
-- ============================================================

-- ------------------------------------------------------------
-- 1. FORNECEDORES E COMPRAS
-- ------------------------------------------------------------
create table if not exists public.fornecedor (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  nome text not null,
  razao_social text,
  cnpj text,
  telefone text,
  email text,
  contato text,
  cep text, logradouro text, numero text, complemento text,
  bairro text, cidade text, uf text,
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fornecedor_clinica on public.fornecedor (clinica_id, nome);

drop trigger if exists trg_fornecedor_updated_at on public.fornecedor;
create trigger trg_fornecedor_updated_at
  before update on public.fornecedor
  for each row execute function public.set_updated_at();

create table if not exists public.compra (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  fornecedor_id uuid references public.fornecedor (id) on delete set null,
  numero_nota text,
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  valor_total numeric(12, 2) not null default 0,
  frete numeric(12, 2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'recebida', 'cancelada')),
  observacao text,
  registrado_por uuid references public.usuario (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_compra_clinica on public.compra (clinica_id, data desc);
create index if not exists idx_compra_fornecedor on public.compra (fornecedor_id);

drop trigger if exists trg_compra_updated_at on public.compra;
create trigger trg_compra_updated_at
  before update on public.compra
  for each row execute function public.set_updated_at();

create table if not exists public.compra_item (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compra (id) on delete cascade,
  item_id uuid references public.item (id) on delete set null,
  descricao text not null,
  quantidade numeric(12, 3) not null check (quantidade > 0),
  valor_unitario numeric(12, 2) not null check (valor_unitario >= 0),
  lote text,
  validade date
);

create index if not exists idx_compra_item_compra on public.compra_item (compra_id);

-- Total da compra recalculado a partir dos itens + frete
create or replace function public.recalcular_compra()
returns trigger
language plpgsql
as $$
declare v_compra uuid;
begin
  v_compra := coalesce(new.compra_id, old.compra_id);
  update public.compra c
  set valor_total = coalesce((
    select sum(i.quantidade * i.valor_unitario)
    from public.compra_item i where i.compra_id = v_compra
  ), 0) + c.frete
  where c.id = v_compra;
  return null;
end;
$$;

drop trigger if exists trg_compra_item_recalc on public.compra_item;
create trigger trg_compra_item_recalc
  after insert or update or delete on public.compra_item
  for each row execute function public.recalcular_compra();

-- ------------------------------------------------------------
-- 2. PLANOS E ASSINATURAS (receita recorrente)
--    O plano em si é um `item` com tipo='plano'; aqui ficam as
--    regras e a assinatura de cada pet.
-- ------------------------------------------------------------
create table if not exists public.plano_beneficio (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  plano_item_id uuid not null references public.item (id) on delete cascade,
  item_id uuid references public.item (id) on delete set null,
  descricao text not null,
  quantidade_mes integer not null default 1 check (quantidade_mes > 0),
  desconto_percentual numeric(5, 2) default 0 check (desconto_percentual between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists idx_beneficio_plano on public.plano_beneficio (plano_item_id);

create table if not exists public.assinatura (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  tutor_id uuid not null references public.tutor (id) on delete cascade,
  pet_id uuid references public.pet (id) on delete cascade,
  plano_item_id uuid not null references public.item (id) on delete restrict,
  valor_mensal numeric(12, 2) not null check (valor_mensal >= 0),
  dia_cobranca integer not null default 5 check (dia_cobranca between 1 and 28),
  inicio date not null default (now() at time zone 'America/Sao_Paulo')::date,
  fim date,
  status text not null default 'ativa' check (status in ('ativa', 'suspensa', 'cancelada')),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assinatura_clinica on public.assinatura (clinica_id, status);
create index if not exists idx_assinatura_tutor on public.assinatura (tutor_id);
create index if not exists idx_assinatura_pet on public.assinatura (pet_id);

drop trigger if exists trg_assinatura_updated_at on public.assinatura;
create trigger trg_assinatura_updated_at
  before update on public.assinatura
  for each row execute function public.set_updated_at();

-- Consumo dos benefícios (quantas vezes o pet usou no mês)
create table if not exists public.uso_beneficio (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  assinatura_id uuid not null references public.assinatura (id) on delete cascade,
  beneficio_id uuid references public.plano_beneficio (id) on delete set null,
  agendamento_id uuid references public.agendamento (id) on delete set null,
  descricao text not null,
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz not null default now()
);

create index if not exists idx_uso_assinatura on public.uso_beneficio (assinatura_id, data desc);

-- ------------------------------------------------------------
-- 3. COMISSÕES
-- ------------------------------------------------------------
create table if not exists public.comissao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  profissional_id uuid not null references public.usuario (id) on delete cascade,
  venda_id uuid references public.venda (id) on delete set null,
  venda_item_id uuid references public.venda_item (id) on delete set null,
  consulta_id uuid references public.consulta (id) on delete set null,
  descricao text not null,
  base_calculo numeric(12, 2) not null check (base_calculo >= 0),
  percentual numeric(5, 2) not null check (percentual >= 0),
  valor numeric(12, 2) not null check (valor >= 0),
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  pago boolean not null default false,
  pago_em date,
  created_at timestamptz not null default now()
);

create index if not exists idx_comissao_clinica on public.comissao (clinica_id, data desc);
create index if not exists idx_comissao_profissional on public.comissao (profissional_id, pago, data desc);

-- ------------------------------------------------------------
-- 4. BANHO E TOSA
-- ------------------------------------------------------------
-- Preferências fixas do pet (ficha de tosa)
create table if not exists public.ficha_banho_tosa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null unique references public.pet (id) on delete cascade,
  tipo_tosa text,                      -- higiênica, na máquina, tesoura, bebê, leão
  altura_maquina text,                 -- nº 1, 2, 3...
  shampoo text,
  perfume text,
  observacoes text,
  restricoes text,                     -- não pode secador quente, medo de máquina
  temperamento text,                   -- dócil, arisco, morde
  updated_at timestamptz not null default now()
);

create index if not exists idx_ficha_bt_clinica on public.ficha_banho_tosa (clinica_id);

drop trigger if exists trg_ficha_bt_updated_at on public.ficha_banho_tosa;
create trigger trg_ficha_bt_updated_at
  before update on public.ficha_banho_tosa
  for each row execute function public.set_updated_at();

-- Execução do serviço num agendamento de banho e tosa
create table if not exists public.execucao_banho_tosa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  agendamento_id uuid not null references public.agendamento (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,
  profissional_id uuid references public.usuario (id) on delete set null,
  assinatura_id uuid references public.assinatura (id) on delete set null,
  servicos text[] not null default '{}',   -- banho, tosa, hidratação, unhas, ouvido, dentes
  inicio timestamptz,
  fim timestamptz,
  observacoes text,
  foto_antes text,
  foto_depois text,
  created_at timestamptz not null default now()
);

create index if not exists idx_execucao_bt_clinica on public.execucao_banho_tosa (clinica_id);
create index if not exists idx_execucao_bt_agendamento on public.execucao_banho_tosa (agendamento_id);

-- ------------------------------------------------------------
-- 5. RLS + grants
-- ------------------------------------------------------------
alter table public.fornecedor enable row level security;
alter table public.compra enable row level security;
alter table public.compra_item enable row level security;
alter table public.plano_beneficio enable row level security;
alter table public.assinatura enable row level security;
alter table public.uso_beneficio enable row level security;
alter table public.comissao enable row level security;
alter table public.ficha_banho_tosa enable row level security;
alter table public.execucao_banho_tosa enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'fornecedor', 'compra', 'plano_beneficio', 'assinatura',
    'uso_beneficio', 'comissao', 'ficha_banho_tosa', 'execucao_banho_tosa'
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

create policy "compra_item: via compra" on public.compra_item for all to authenticated
  using (exists (select 1 from public.compra c where c.id = compra_id
    and c.clinica_id = (select public.clinica_do_usuario())))
  with check (exists (select 1 from public.compra c where c.id = compra_id
    and c.clinica_id = (select public.clinica_do_usuario())));

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;
