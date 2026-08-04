-- ============================================================
-- VetHub — módulo ITENS e ESTOQUE
-- Catálogo de produtos, serviços e planos + controle de estoque
-- com lote, validade e movimentação.
-- ============================================================

-- ------------------------------------------------------------
-- Tabelas auxiliares do catálogo (o menu "Item" da concorrência)
-- ------------------------------------------------------------
create table if not exists public.marca (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (clinica_id, nome)
);

create table if not exists public.unidade_medida (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  nome text not null,              -- Unidade, Caixa, Frasco, Comprimido
  sigla text not null,             -- un, cx, fr, cp, ml, mg
  fracionavel boolean not null default false,
  created_at timestamptz not null default now(),
  unique (clinica_id, sigla)
);

-- Grupo e subgrupo: hierarquia de categorias (grupo tem pai nulo)
create table if not exists public.grupo_item (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  nome text not null,
  grupo_pai_id uuid references public.grupo_item (id) on delete cascade,
  tipo text not null default 'produto' check (tipo in ('produto', 'servico', 'ambos')),
  created_at timestamptz not null default now()
);

create index if not exists idx_grupo_clinica on public.grupo_item (clinica_id);
create index if not exists idx_grupo_pai on public.grupo_item (grupo_pai_id);

-- ------------------------------------------------------------
-- Item: produto, serviço ou plano (uma tabela só, tipada)
-- ------------------------------------------------------------
create table if not exists public.item (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  tipo text not null check (tipo in ('produto', 'servico', 'plano')),
  nome text not null,
  codigo text,                     -- código interno / SKU
  codigo_barras text,
  descricao text,
  grupo_id uuid references public.grupo_item (id) on delete set null,
  marca_id uuid references public.marca (id) on delete set null,
  unidade_id uuid references public.unidade_medida (id) on delete set null,

  preco_venda numeric(12, 2) not null default 0 check (preco_venda >= 0),
  preco_custo numeric(12, 2) not null default 0 check (preco_custo >= 0),
  comissao_percentual numeric(5, 2) default 0 check (comissao_percentual >= 0 and comissao_percentual <= 100),

  -- controle de estoque (só faz sentido para produto)
  controla_estoque boolean not null default false,
  estoque_atual numeric(12, 3) not null default 0,
  estoque_minimo numeric(12, 3) not null default 0,

  -- clínico
  medicamento boolean not null default false,
  principio_ativo text,
  requer_receita boolean not null default false,
  vacina boolean not null default false,

  -- serviço
  duracao_minutos integer check (duracao_minutos > 0),

  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_item_clinica on public.item (clinica_id);
create index if not exists idx_item_tipo on public.item (clinica_id, tipo, ativo);
create index if not exists idx_item_nome on public.item (clinica_id, nome);
create index if not exists idx_item_grupo on public.item (grupo_id);
-- produtos que precisam de reposição
create index if not exists idx_item_estoque_baixo on public.item (clinica_id)
  where controla_estoque and estoque_atual <= estoque_minimo;

drop trigger if exists trg_item_updated_at on public.item;
create trigger trg_item_updated_at
  before update on public.item
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Lotes com validade (controle de validade da concorrência)
-- ------------------------------------------------------------
create table if not exists public.lote (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  item_id uuid not null references public.item (id) on delete cascade,
  codigo text not null,
  validade date,
  quantidade numeric(12, 3) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_lote_clinica on public.lote (clinica_id);
create index if not exists idx_lote_item on public.lote (item_id);
create index if not exists idx_lote_validade on public.lote (clinica_id, validade)
  where validade is not null and quantidade > 0;

-- ------------------------------------------------------------
-- Movimentação de estoque (entrada, saída, ajuste, perda)
-- ------------------------------------------------------------
create table if not exists public.movimentacao_estoque (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  item_id uuid not null references public.item (id) on delete cascade,
  lote_id uuid references public.lote (id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida', 'ajuste', 'perda')),
  quantidade numeric(12, 3) not null check (quantidade > 0),
  valor_unitario numeric(12, 2),
  motivo text,
  origem text,                     -- compra, consulta, internacao, venda, inventario
  consulta_id uuid references public.consulta (id) on delete set null,
  internacao_id uuid references public.internacao (id) on delete set null,
  registrado_por uuid references public.usuario (id) on delete set null,
  data timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_movimentacao_clinica on public.movimentacao_estoque (clinica_id, data desc);
create index if not exists idx_movimentacao_item on public.movimentacao_estoque (item_id, data desc);

-- Toda movimentação recalcula o estoque do item (entrada soma; saída,
-- perda e ajuste negativo subtraem — 'ajuste' aqui sempre entra como
-- correção para baixo; para subir use 'entrada' com motivo inventário).
create or replace function public.aplicar_movimentacao_estoque()
returns trigger
language plpgsql
as $$
declare
  v_item uuid;
begin
  v_item := coalesce(new.item_id, old.item_id);

  update public.item i
  set estoque_atual = coalesce((
    select sum(
      case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end
    )
    from public.movimentacao_estoque m
    where m.item_id = v_item
  ), 0)
  where i.id = v_item and i.controla_estoque;

  -- espelha a quantidade no lote, quando a movimentação tem lote
  if coalesce(new.lote_id, old.lote_id) is not null then
    update public.lote l
    set quantidade = coalesce((
      select sum(
        case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end
      )
      from public.movimentacao_estoque m
      where m.lote_id = l.id
    ), 0)
    where l.id = coalesce(new.lote_id, old.lote_id);
  end if;

  return null;
end;
$$;

drop trigger if exists trg_movimentacao_aplica on public.movimentacao_estoque;
create trigger trg_movimentacao_aplica
  after insert or update or delete on public.movimentacao_estoque
  for each row execute function public.aplicar_movimentacao_estoque();

-- ------------------------------------------------------------
-- Orçamento: itens do orçamento podem apontar para o catálogo
-- ------------------------------------------------------------
alter table public.orcamento_item
  add column if not exists item_id uuid references public.item (id) on delete set null;

-- ------------------------------------------------------------
-- RLS + grants
-- ------------------------------------------------------------
alter table public.marca enable row level security;
alter table public.unidade_medida enable row level security;
alter table public.grupo_item enable row level security;
alter table public.item enable row level security;
alter table public.lote enable row level security;
alter table public.movimentacao_estoque enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'marca', 'unidade_medida', 'grupo_item', 'item', 'lote', 'movimentacao_estoque'
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

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;

-- ------------------------------------------------------------
-- Semente: unidades de medida padrão para clínicas novas
-- (aplicada às clínicas existentes; novas recebem no cadastro)
-- ------------------------------------------------------------
insert into public.unidade_medida (clinica_id, nome, sigla, fracionavel)
select c.id, u.nome, u.sigla, u.fracionavel
from public.clinica c
cross join (values
  ('Unidade', 'un', false),
  ('Caixa', 'cx', false),
  ('Frasco', 'fr', false),
  ('Comprimido', 'cp', true),
  ('Mililitro', 'ml', true),
  ('Grama', 'g', true),
  ('Quilograma', 'kg', true),
  ('Ampola', 'amp', false)
) as u(nome, sigla, fracionavel)
on conflict (clinica_id, sigla) do nothing;
