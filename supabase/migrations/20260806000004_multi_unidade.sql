-- ============================================================
-- Multi-unidade: a clínica passa a poder ter filiais
--
-- O QUE É COMPARTILHADO entre as unidades (decisão de produto, e é o padrão
-- do mercado — o cliente vai em qualquer filial):
--   tutor, pet, catálogo de itens, grupos, marcas, unidades de medida,
--   fornecedores, planos, categorias financeiras, equipe.
--
-- O QUE É POR UNIDADE (porque é FÍSICO — e é aqui que mora a dificuldade
-- real do multi-unidade, não nas políticas de segurança):
--   estoque (lote e movimentação), caixa, venda, compra, agenda, internação.
--
-- "Quanto tem de V10?" deixa de ser uma pergunta e vira "quanto tem de V10
-- NA UNIDADE CENTRO?". Isso não é filtro, é mudança de modelo: o saldo do
-- item passa a ser a soma dos saldos por unidade.
--
-- Esta migração monta a fundação e preenche tudo com a unidade Matriz, que é
-- criada para cada clínica existente. Nada muda de comportamento hoje: o
-- sistema continua funcionando como uma unidade só, mas já com a coluna no
-- lugar. É o passo que evita uma migração de dados dolorosa lá na frente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A unidade
-- ------------------------------------------------------------
create table if not exists public.unidade (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  nome text not null,
  -- A matriz não pode ser excluída e é o destino padrão de tudo que não
  -- disser de qual unidade veio.
  principal boolean not null default false,
  ativa boolean not null default true,
  cnpj text,
  telefone text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_unidade_clinica on public.unidade (clinica_id, ativa);

-- Uma matriz por clínica, no máximo.
create unique index if not exists uniq_unidade_principal
  on public.unidade (clinica_id)
  where principal;

drop trigger if exists trg_unidade_updated_at on public.unidade;
create trigger trg_unidade_updated_at
  before update on public.unidade
  for each row execute function public.set_updated_at();

-- Toda clínica ganha a sua matriz, herdando os dados que já tinha.
insert into public.unidade (clinica_id, nome, principal, cnpj, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf)
select c.id, 'Matriz', true, c.cnpj, c.telefone, c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf
from public.clinica c
where not exists (select 1 from public.unidade u where u.clinica_id = c.id);

-- ------------------------------------------------------------
-- 2. Onde cada pessoa trabalha
-- ------------------------------------------------------------
-- Nulo = enxerga a clínica inteira (dono, gerente, contador). Preenchido =
-- trabalha naquela unidade. Deixar nulo por padrão mantém o comportamento
-- atual para quem já está cadastrado.
alter table public.usuario
  add column if not exists unidade_id uuid
    references public.unidade (id) on delete set null;

comment on column public.usuario.unidade_id is
  'Unidade onde a pessoa trabalha. Nulo = vê todas as unidades da clínica.';

-- ------------------------------------------------------------
-- 3. As tabelas físicas ganham unidade
-- ------------------------------------------------------------
do $$
declare
  t text;
  matriz_por_clinica text := 'update public.%1$I x set unidade_id = u.id
     from public.unidade u
     where u.clinica_id = x.clinica_id and u.principal and x.unidade_id is null';
begin
  foreach t in array array[
    'lote', 'movimentacao_estoque', 'caixa', 'venda', 'compra',
    'agendamento', 'internacao'
  ] loop
    execute format(
      'alter table public.%1$I add column if not exists unidade_id uuid
         references public.unidade (id) on delete restrict', t
    );
    execute format(matriz_por_clinica, t);
    execute format(
      'create index if not exists idx_%1$s_unidade on public.%1$I (unidade_id)', t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4. Saldo de estoque POR UNIDADE
-- ------------------------------------------------------------
-- `item.estoque_atual` continua existindo como o total da clínica (é o que
-- as telas de catálogo mostram), mas quem opera precisa do saldo do lugar
-- onde está. Esta visão responde isso sem duplicar dado nenhum.
create or replace view public.estoque_por_unidade as
select
  m.clinica_id,
  m.unidade_id,
  m.item_id,
  sum(case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end) as saldo
from public.movimentacao_estoque m
group by m.clinica_id, m.unidade_id, m.item_id;

comment on view public.estoque_por_unidade is
  'Saldo de cada item em cada unidade. item.estoque_atual é o total da clínica.';

-- ------------------------------------------------------------
-- 5. Quais unidades a pessoa alcança
-- ------------------------------------------------------------
-- Devolve TODAS as unidades da clínica para quem não está preso a uma, e só
-- a dela para quem está. É a função que as telas usam para montar o seletor
-- de unidade e filtrar as consultas.
create or replace function public.unidades_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.unidade u
  join public.usuario me on me.id = auth.uid()
  where u.clinica_id = me.clinica_id
    and (me.unidade_id is null or u.id = me.unidade_id)
$$;

revoke execute on function public.unidades_do_usuario() from anon;

-- ------------------------------------------------------------
-- 6. Segurança da tabela nova
-- ------------------------------------------------------------
alter table public.unidade enable row level security;

drop policy if exists "unidade: select da clinica" on public.unidade;
drop policy if exists "unidade: insert na clinica" on public.unidade;
drop policy if exists "unidade: update da clinica" on public.unidade;
drop policy if exists "unidade: delete da clinica" on public.unidade;

create policy "unidade: select da clinica" on public.unidade for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "unidade: insert na clinica" on public.unidade for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "unidade: update da clinica" on public.unidade for update to authenticated
  using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));
-- A matriz nunca pode ser apagada: é o destino padrão de todo registro.
create policy "unidade: delete da clinica" on public.unidade for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()) and not principal);

grant select, insert, update, delete on public.unidade to authenticated;
grant select on public.estoque_por_unidade to authenticated;
grant all privileges on public.unidade to service_role;
