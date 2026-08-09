-- ============================================================
-- Exames, e a ponte entre o veterinário e a recepção
-- ============================================================
--
-- Duas coisas que nasceram da mesma observação de quem trabalha em clínica:
-- o veterinário faz algo na sala e diz ao tutor "passa na recepção que ela
-- te entrega". Hoje o sistema não conta isso para a recepção — ela só
-- descobre quando o tutor chega no balcão e pergunta.
--
--   1. `exame`: o pedido de exame vira registro, com resultado guardado, em
--      vez de morrer numa linha de texto dentro da conduta da consulta.
--   2. `entregue_em`: marca em receita e orçamento o que já saiu pelo
--      balcão. É o que faz a fila da recepção esvaziar.

-- ------------------------------------------------------------
-- 1. Exames
-- ------------------------------------------------------------
create table if not exists public.exame (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,

  -- De onde saiu o pedido. Opcional porque exame também se pede fora de
  -- consulta — o tutor liga pedindo repetir um hemograma, por exemplo.
  consulta_id uuid references public.consulta (id) on delete set null,
  veterinario_id uuid references public.usuario (id) on delete set null,

  nome text not null,
  tipo text not null default 'laboratorial'
    check (tipo in ('laboratorial', 'imagem', 'outro')),

  -- Ligação opcional com o catálogo, para cobrar no PDV sem redigitar.
  item_id uuid references public.item (id) on delete set null,

  -- Indicação clínica: é o que o laboratório precisa saber para interpretar,
  -- e é o que o próprio veterinário esquece quando o resultado chega dias
  -- depois.
  indicacao text,

  status text not null default 'solicitado'
    check (status in ('solicitado', 'coletado', 'pronto', 'entregue', 'cancelado')),

  solicitado_em timestamptz not null default now(),
  previsto_para date,
  resultado_em timestamptz,

  -- O laudo. Texto para o que se digita, arquivo para o PDF do laboratório.
  resultado text,
  arquivo_url text,

  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exame_pet on public.exame (pet_id, solicitado_em desc);
create index if not exists idx_exame_clinica_status
  on public.exame (clinica_id, status, solicitado_em desc);

comment on table public.exame is
  'Exames pedidos pelo veterinário, com resultado. Fica na ficha do pet e na fila da recepção.';

-- ------------------------------------------------------------
-- 2. O que já saiu pelo balcão
-- ------------------------------------------------------------
-- Sem esta marca a fila da recepção nunca esvazia: a receita de ontem
-- continuaria pedindo para ser impressa hoje, e em uma semana a tela vira
-- um monte de coisa velha que ninguém lê.
alter table public.receita
  add column if not exists entregue_em timestamptz;
alter table public.orcamento
  add column if not exists entregue_em timestamptz;

comment on column public.receita.entregue_em is
  'Quando a recepção imprimiu e entregou ao tutor. Nulo = ainda na fila do balcão.';
comment on column public.orcamento.entregue_em is
  'Quando a recepção imprimiu e entregou ao tutor. Nulo = ainda na fila do balcão.';

-- ------------------------------------------------------------
-- Quem enxerga o quê
-- ------------------------------------------------------------
alter table public.exame enable row level security;

create policy "exame: select da clinica" on public.exame for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "exame: insert na clinica" on public.exame for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "exame: update da clinica" on public.exame for update to authenticated
  using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "exame: delete da clinica" on public.exame for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

grant select, insert, update, delete on public.exame to authenticated;
grant all privileges on public.exame to service_role;

drop trigger if exists trg_exame_updated on public.exame;
create trigger trg_exame_updated
  before update on public.exame
  for each row execute function public.set_updated_at();
